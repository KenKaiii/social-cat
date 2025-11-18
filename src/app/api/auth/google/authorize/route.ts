import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { oauthStateTable, userCredentialsTable } from '@/lib/schema';
import { logger } from '@/lib/logger';
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Google OAuth 2.0 Authorization Endpoint
 *
 * Generates an OAuth 2.0 authorization URL and redirects the user to Google
 * to authorize the application for Gmail access.
 *
 * Flow:
 * 1. Check if user is authenticated
 * 2. Generate OAuth 2.0 authorization link
 * 3. Store state in database for verification
 * 4. Redirect user to Google authorization page
 */
export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    // Get Google OAuth app credentials from database
    const [appCred] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.platform, 'google_oauth_app'))
      .limit(1);

    if (!appCred) {
      logger.error('Google OAuth app credentials not configured');
      return NextResponse.json(
        { error: 'Google OAuth app not configured. Please add Google OAuth App Credentials in the credentials page.' },
        { status: 500 }
      );
    }

    // Get client credentials
    let clientId: string;
    try {
      const creds = getOAuthAppCredentials(appCred, 'Google');
      clientId = creds.clientId;
    } catch (error) {
      logger.error({ error }, 'Failed to get Google OAuth app credentials');
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid Google OAuth app credentials' },
        { status: 500 }
      );
    }

    // Generate callback URL
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
      : 'http://localhost:3123/api/auth/google/callback';

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in database
    await db.insert(oauthStateTable).values({
      state,
      codeVerifier: '', // Google doesn't use PKCE in this flow
      userId: session.user.id,
      provider: 'google',
    });

    // Build Google OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

    logger.info(
      { userId: session.user.id, provider: 'google' },
      'Generated Google OAuth authorization URL'
    );

    // Redirect to Google authorization page
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logger.error({ error }, 'Failed to generate Google OAuth URL');
    return NextResponse.json(
      { error: 'Failed to initiate Google authorization' },
      { status: 500 }
    );
  }
}
