import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { oauthStateTable, accountsTable, userCredentialsTable } from '@/lib/schema';
import { logger } from '@/lib/logger';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '@/lib/encryption';
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';

/**
 * YouTube OAuth 2.0 Callback Handler
 *
 * Handles the callback from Google after user authorization for YouTube access.
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
      logger.warn({ error }, 'YouTube OAuth authorization denied');
      return new NextResponse(
        `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Authorization Cancelled</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #1a1625;
        color: #f5f3ff; }
      }
      .container {
        text-align: center;
        padding: 48px;
        max-width: 420px;
        background: #241d30;
        border: 1px solid #3a2f4a;
        border-radius: 12px;
      }
      .icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 24px;
        border-radius: 50%;
        background: rgba(255, 68, 68, 0.1);
        border: 2px solid #ff4444;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        color: #ff4444;
        font-weight: bold;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
        font-weight: 700;
        color: #f5f3ff; }
        letter-spacing: -0.02em;
      }
      .message {
        margin: 0 0 8px;
        color: #a599c8;
        font-size: 15px;
        line-height: 1.6;
      }
      .timer {
        margin-top: 24px;
        color: #a599c8;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">×</div>
      <h1>Authorization Cancelled</h1>
      <p class="message">You denied access to YouTube.</p>
      <p class="message">Try again when ready.</p>
      <p class="timer">Window closing in 3 seconds...</p>
    </div>
    <script>
      setTimeout(() => window.close(), 3000);
    </script>
  </body>
</html>`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Validate required parameters
    if (!code || !state) {
      logger.error('Missing code or state parameter in YouTube OAuth callback');
      return NextResponse.json(
        { error: 'Invalid OAuth callback: missing code or state' },
        { status: 400 }
      );
    }

    // Get YouTube OAuth app credentials from database
    const [appCred] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.platform, 'youtube_oauth_app'))
      .limit(1);

    if (!appCred) {
      logger.error('YouTube OAuth app credentials not configured');
      return NextResponse.json(
        { error: 'YouTube OAuth is not configured' },
        { status: 500 }
      );
    }

    // Get client credentials
    let clientId: string;
    let clientSecret: string;
    try {
      const creds = getOAuthAppCredentials(appCred, 'YouTube');
      clientId = creds.clientId;
      clientSecret = creds.clientSecret;
    } catch (error) {
      logger.error({ error }, 'Failed to get YouTube OAuth app credentials');
      return new NextResponse(
        `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Configuration Error</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #1a1625;
        color: #f5f3ff;
      }
      .container {
        text-align: center;
        padding: 48px;
        max-width: 420px;
        background: #241d30;
        border: 1px solid #3a2f4a;
        border-radius: 12px;
      }
      .icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 24px;
        border-radius: 50%;
        background: rgba(255, 68, 68, 0.1);
        border: 2px solid #ff4444;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        color: #ff4444;
        font-weight: bold;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
        font-weight: 700;
        color: #f5f3ff;
        letter-spacing: -0.02em;
      }
      .message {
        margin: 0 0 8px;
        color: #a599c8;
        font-size: 15px;
        line-height: 1.6;
      }
      .timer {
        margin-top: 24px;
        color: #a599c8;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">!</div>
      <h1>Configuration Error</h1>
      <p class="message">${error instanceof Error ? error.message : 'YouTube OAuth is not configured'}</p>
      <p class="timer">Window closing in 5 seconds...</p>
    </div>
    <script>
      setTimeout(() => window.close(), 5000);
    </script>
  </body>
</html>`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Look up OAuth state in database
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

    // Initialize Google OAuth2 client
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/youtube/callback`
      : 'http://localhost:3123/api/auth/youtube/callback';

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      callbackUrl
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken({
      code,
      codeVerifier: oauthState.codeVerifier,
    });

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    oauth2Client.setCredentials(tokens);

    // Get YouTube channel info
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const channelResponse = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel || !channel.id) {
      throw new Error('Could not retrieve YouTube channel information');
    }

    logger.info(
      { userId: oauthState.userId, channelId: channel.id, channelTitle: channel.snippet?.title },
      'YouTube OAuth login successful'
    );

    // Calculate token expiration
    const expiresAt = tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : null;

    // Encrypt tokens before storing
    const encryptedAccessToken = await encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? await encrypt(tokens.refresh_token) : null;

    // Check if account already exists
    const [existingAccount] = await db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.userId, oauthState.userId),
          eq(accountsTable.provider, 'youtube')
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
          providerAccountId: channel.id,
          account_name: channel.snippet?.title || null,
        })
        .where(eq(accountsTable.id, existingAccount.id));

      logger.info({ accountId: existingAccount.id }, 'Updated existing YouTube account');
    } else {
      // Create new account
      await db.insert(accountsTable).values({
        id: `youtube_${channel.id}_${Date.now()}`,
        userId: oauthState.userId,
        type: 'oauth',
        provider: 'youtube',
        providerAccountId: channel.id,
        account_name: channel.snippet?.title || null,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        token_type: 'Bearer',
        scope: tokens.scope || 'https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube',
      });

      logger.info({ userId: oauthState.userId }, 'Created new YouTube account');
    }

    // Clean up OAuth state
    await db
      .delete(oauthStateTable)
      .where(eq(oauthStateTable.state, state));

    // Return success page that notifies parent window and auto-closes
    return new NextResponse(
      `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Authorization Successful</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #1a1625;
        color: #f5f3ff; }
      }
      .container {
        text-align: center;
        padding: 48px;
        max-width: 420px;
        background: #241d30;
        border: 1px solid #3a2f4a;
        border-radius: 12px;
      }
      .icon {
        width: 72px;
        height: 72px;
        margin: 0 auto 24px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.1);
        border: 2px solid #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        color: #10b981;
        font-weight: bold;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
        font-weight: 700;
        color: #f5f3ff; }
        letter-spacing: -0.02em;
      }
      .message {
        margin: 0 0 8px;
        color: #a599c8;
        font-size: 15px;
        line-height: 1.6;
      }
      .channel {
        font-weight: 600;
        color: #ff6b35;
      }
      .timer {
        margin-top: 24px;
        color: #a599c8;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">✓</div>
      <h1>Connected Successfully</h1>
      <p class="message">YouTube account linked</p>
      <p class="message"><span class="channel">${channel.snippet?.title || 'Your Channel'}</span></p>
      <p class="timer">Window closing in 2 seconds...</p>
    </div>
    <script>
      if (window.opener) {
        window.opener.postMessage({
          type: 'youtube-auth-success',
          channelId: '${channel.id}',
          channelTitle: '${channel.snippet?.title?.replace(/'/g, "\\'")}',
        }, '*');
      }
      setTimeout(() => window.close(), 2000);
    </script>
  </body>
</html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (error) {
    logger.error({ error }, 'YouTube OAuth callback error');

    return new NextResponse(
      `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Authorization Error</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: #1a1625;
      }
      .container {
        text-align: center;
        padding: 48px;
        max-width: 420px; background: #241d30; border: 1px solid #3a2f4a; border-radius: 12px;
      }
      .icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: rgba(255, 68, 68, 0.1); border: 2px solid #ff4444;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        color: #ff4444;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
        font-weight: 600;
        color: #f5f3ff;
      }
      p {
        margin: 0 0 20px;
        color: #a599c8;
        font-size: 15px;
        line-height: 1.5;
      }
      .error-details {
        color: #a599c8;
        font-size: 13px;
        font-family: monospace;
      }
      .timer {
        color: #a599c8;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">!</div>
      <h1>Authorization Error</h1>
      <p>Failed to complete YouTube authorization. Please try again.</p>
      <p class="error-details">${error instanceof Error ? error.message : 'Unknown error'}</p>
      <p class="timer">Closing in 5 seconds...</p>
    </div>
    <script>
      setTimeout(() => window.close(), 5000);
    </script>
  </body>
</html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
