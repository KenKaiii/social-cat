import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { db } from '@/lib/db';
import { oauthStateTable, accountsTable, userCredentialsTable } from '@/lib/schema';
import { logger } from '@/lib/logger';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';

/**
 * Twitter OAuth 2.0 Callback Handler
 *
 * Handles the callback from Twitter after user authorization.
 *
 * Flow:
 * 1. Extract code and state from query parameters
 * 2. Look up codeVerifier from database using state
 * 3. Exchange authorization code for access/refresh tokens
 * 4. Store tokens in accounts table
 * 5. Clean up temporary OAuth state
 * 6. Close popup and notify parent window of success
 */
export async function GET(request: NextRequest) {
  try {
    // Extract code and state from query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
      logger.warn({ error }, 'Twitter OAuth authorization denied');
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authorization Failed</title>
            <style>
              body { font-family: system-ui; padding: 40px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Authorization Failed</h1>
            <p>You denied access to Twitter. Please try again.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error('Missing code or state parameter in OAuth callback');
      return NextResponse.json(
        { error: 'Invalid OAuth callback: missing code or state' },
        { status: 400 }
      );
    }

    // Look up OAuth state in database first (we need userId to fetch credentials)
    const [oauthState] = await db
      .select()
      .from(oauthStateTable)
      .where(eq(oauthStateTable.state, state))
      .limit(1);

    if (!oauthState) {
      logger.error({ state }, 'OAuth state not found in database');
      return NextResponse.json(
        { error: 'Invalid OAuth state. Please try again.' },
        { status: 400 }
      );
    }

    // Get Twitter OAuth app credentials from database
    const [appCred] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.platform, 'twitter_oauth2_app'))
      .limit(1);

    if (!appCred) {
      logger.error('Twitter OAuth app credentials not configured');
      return NextResponse.json(
        { error: 'Twitter OAuth is not configured' },
        { status: 500 }
      );
    }

    // Extract and decrypt OAuth app credentials
    let clientId: string;
    let clientSecret: string;
    try {
      const creds = getOAuthAppCredentials(appCred, 'Twitter');
      clientId = creds.clientId;
      clientSecret = creds.clientSecret;
    } catch (error) {
      logger.error({ error }, 'Failed to get Twitter OAuth app credentials in callback');

      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connection Failed</title>
            <style>
              body { font-family: system-ui; padding: 40px; text-align: center; }
              .error { color: #dc2626; }
            </style>
          </head>
          <body>
            <h1 class="error">Connection Failed</h1>
            <p>An error occurred while connecting to Twitter.</p>
            <p>${error instanceof Error ? error.message : 'Invalid credentials'}</p>
            <script>
              setTimeout(() => window.close(), 5000);
            </script>
          </body>
        </html>
        `,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Initialize Twitter API client
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    // Generate callback URL (must match the one used in authorize)
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
      : 'http://localhost:3123/api/auth/twitter/callback';

    // Exchange code for tokens
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await client.loginWithOAuth2({
      code,
      codeVerifier: oauthState.codeVerifier,
      redirectUri: callbackUrl,
    });

    // Get Twitter user info
    const { data: twitterUser } = await loggedClient.v2.me();

    logger.info(
      { userId: oauthState.userId, twitterUserId: twitterUser.id, twitterUsername: twitterUser.username },
      'Twitter OAuth login successful'
    );

    // Store tokens in accounts table (encrypted for security)
    const expiresAt = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : null;

    // Encrypt tokens before storing
    const encryptedAccessToken = await encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? await encrypt(refreshToken) : null;

    // Check if account already exists
    const [existingAccount] = await db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.userId, oauthState.userId),
          eq(accountsTable.provider, 'twitter')
        )
      )
      .limit(1);

    if (existingAccount) {
      // Update existing account
      await db
        .update(accountsTable)
        .set({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken || existingAccount.refresh_token,
          expires_at: expiresAt,
          providerAccountId: twitterUser.id,
          account_name: twitterUser.username || null,
        })
        .where(eq(accountsTable.id, existingAccount.id));
    } else {
      // Create new account record
      await db.insert(accountsTable).values({
        id: `twitter_${twitterUser.id}_${Date.now()}`,
        userId: oauthState.userId,
        type: 'oauth',
        provider: 'twitter',
        providerAccountId: twitterUser.id,
        account_name: twitterUser.username || null,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        token_type: 'bearer',
        scope: 'tweet.read tweet.write users.read offline.access',
      });
    }

    // Clean up OAuth state
    await db.delete(oauthStateTable).where(eq(oauthStateTable.state, state));

    // Return success page that closes the popup and notifies parent
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitter Connected</title>
          <style>
            body { font-family: system-ui; padding: 40px; text-align: center; }
            .success { color: #16a34a; }
            .spinner {
              border: 3px solid #f3f3f3;
              border-top: 3px solid #16a34a;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <h1 class="success">✓ Twitter Connected Successfully</h1>
          <p>@${twitterUser.username}</p>
          <div class="spinner"></div>
          <p>Closing window...</p>
          <script>
            // Notify parent window of success
            if (window.opener) {
              window.opener.postMessage({ type: 'twitter-auth-success', username: '${twitterUser.username}' }, '*');
            }
            // Close popup after 2 seconds
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    logger.error({ error }, 'Twitter OAuth callback failed');

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body { font-family: system-ui; padding: 40px; text-align: center; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Connection Failed</h1>
          <p>An error occurred while connecting to Twitter.</p>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
          <script>
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
