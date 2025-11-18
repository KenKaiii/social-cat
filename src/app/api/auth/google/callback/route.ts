import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { oauthStateTable, userCredentialsTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { encrypt } from '@/lib/encryption';
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';
import { randomUUID } from 'crypto';

/**
 * Google OAuth 2.0 Callback Endpoint
 *
 * Handles the callback from Google after user authorization.
 *
 * Flow:
 * 1. Verify state parameter (CSRF protection)
 * 2. Exchange authorization code for access token and refresh token
 * 3. Store tokens securely in database
 * 4. Redirect user back to credentials page
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check if user denied authorization
    if (error) {
      logger.warn({ error }, 'User denied Google authorization');
      return NextResponse.redirect(
        new URL(`/dashboard/credentials?error=${encodeURIComponent('Authorization denied')}`, request.url)
      );
    }

    if (!code || !state) {
      logger.error('Missing code or state in Google OAuth callback');
      return NextResponse.redirect(
        new URL('/dashboard/credentials?error=invalid_callback', request.url)
      );
    }

    // Verify state and get user ID
    const [stateRecord] = await db
      .select()
      .from(oauthStateTable)
      .where(eq(oauthStateTable.state, state))
      .limit(1);

    if (!stateRecord || stateRecord.provider !== 'google') {
      logger.error({ state }, 'Invalid or expired Google OAuth state');
      return NextResponse.redirect(
        new URL('/dashboard/credentials?error=invalid_state', request.url)
      );
    }

    const userId = stateRecord.userId;

    // Get Google OAuth app credentials from database
    const [appCred] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.platform, 'google_oauth_app'))
      .limit(1);

    if (!appCred) {
      logger.error('Google OAuth app credentials not configured');
      return NextResponse.redirect(
        new URL('/dashboard/credentials?error=config_missing', request.url)
      );
    }

    // Get client credentials
    let clientId: string;
    let clientSecret: string;
    try {
      const creds = getOAuthAppCredentials(appCred, 'Google');
      clientId = creds.clientId;
      clientSecret = creds.clientSecret;
    } catch (error) {
      logger.error({ error }, 'Failed to get Google OAuth app credentials');
      return NextResponse.redirect(
        new URL('/dashboard/credentials?error=config_missing', request.url)
      );
    }

    // Generate callback URL (must match the one in authorize route)
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
      : 'http://localhost:3123/api/auth/google/callback';

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      logger.error({ error: errorData }, 'Failed to exchange Google authorization code');
      return NextResponse.redirect(
        new URL('/dashboard/credentials?error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token || !refresh_token) {
      logger.error('Google did not return access_token or refresh_token');
      return NextResponse.redirect(
        new URL('/dashboard/credentials?error=missing_tokens', request.url)
      );
    }

    // Calculate expiry date
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Store credentials in database (tokens are stored as JSON and encrypted)
    const credentialData = JSON.stringify({
      access_token,
      refresh_token,
      expires_at: expiresAt.toISOString(),
    });

    const encryptedValue = encrypt(credentialData);

    await db.insert(userCredentialsTable).values({
      id: randomUUID(),
      userId,
      platform: 'google',
      name: 'Google (Gmail)',
      type: 'oauth',
      encryptedValue,
    });

    // Clean up state record
    await db.delete(oauthStateTable).where(eq(oauthStateTable.state, state));

    logger.info({ userId, provider: 'google' }, 'Google OAuth completed successfully');

    // Redirect back to credentials page with success message
    return NextResponse.redirect(
      new URL('/dashboard/credentials?success=google_connected', request.url)
    );
  } catch (error) {
    logger.error({ error }, 'Error in Google OAuth callback');
    return NextResponse.redirect(
      new URL('/dashboard/credentials?error=callback_failed', request.url)
    );
  }
}
