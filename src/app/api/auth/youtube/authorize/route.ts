import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { oauthStateTable, userCredentialsTable } from '@/lib/schema';
import { logger } from '@/lib/logger';
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * YouTube OAuth 2.0 Authorization Endpoint
 *
 * Generates an OAuth 2.0 authorization URL and redirects the user to Google
 * to authorize the application for YouTube access.
 *
 * Flow:
 * 1. Check if user is authenticated
 * 2. Generate OAuth 2.0 authorization link with PKCE
 * 3. Store state and codeVerifier in database
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

    // Get YouTube OAuth app credentials from database
    const [appCred] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.platform, 'youtube_oauth_app'))
      .limit(1);

    if (!appCred) {
      logger.error('YouTube OAuth app credentials not configured');
      return NextResponse.json(
        { error: 'YouTube OAuth app not configured. Please add YouTube OAuth App Credentials in the credentials page.' },
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
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid YouTube OAuth app credentials' },
        { status: 500 }
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

    // Generate state and code verifier for PKCE
    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');

    // Generate authorization URL
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Required for refresh token
      scope: [
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube',
      ],
      state,
      prompt: 'consent', // Force consent screen to ensure refresh token
      code_challenge: codeChallenge,
      // @ts-expect-error - googleapis types don't match actual API
      code_challenge_method: 'S256',
    });

    // Store state and code verifier in database for callback verification
    await db.insert(oauthStateTable).values({
      state,
      codeVerifier,
      userId: session.user.id,
      provider: 'youtube',
    });

    logger.info(
      { userId: session.user.id, provider: 'youtube' },
      'YouTube OAuth state stored'
    );

    // Redirect to Google OAuth authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error({ error }, 'YouTube OAuth authorization error');
    return NextResponse.json(
      { error: 'Failed to start YouTube authorization' },
      { status: 500 }
    );
  }
}
