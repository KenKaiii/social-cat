import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { oauthStateTable, userCredentialsTable } from '@/lib/schema';
import { logger } from '@/lib/logger';
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';
import { eq } from 'drizzle-orm';

/**
 * Twitter OAuth 2.0 Authorization Endpoint
 *
 * Generates an OAuth 2.0 authorization URL and redirects the user to Twitter
 * to authorize the application.
 *
 * Flow:
 * 1. Check if user is authenticated
 * 2. Generate OAuth 2.0 authorization link with PKCE
 * 3. Store state and codeVerifier in database
 * 4. Redirect user to Twitter authorization page
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

    // Get Twitter OAuth app credentials from database
    const [appCred] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.platform, 'twitter_oauth2_app'))
      .limit(1);

    if (!appCred) {
      logger.error('Twitter OAuth app credentials not configured');
      return NextResponse.json(
        { error: 'Twitter OAuth app not configured. Please add Twitter OAuth 2.0 App Credentials in the credentials page.' },
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
      logger.error({ error }, 'Failed to get Twitter OAuth app credentials');
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid Twitter OAuth app credentials' },
        { status: 500 }
      );
    }

    // Initialize Twitter API client with OAuth 2.0 credentials
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    // Generate callback URL
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/twitter/callback`
      : 'http://localhost:3123/api/auth/twitter/callback';

    // Generate OAuth 2.0 authorization link with PKCE
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      callbackUrl,
      {
        scope: [
          'tweet.read',
          'tweet.write',
          'users.read',
          'offline.access', // Required for refresh token
        ],
      }
    );

    // Store state and codeVerifier in database
    await db.insert(oauthStateTable).values({
      state,
      codeVerifier,
      userId: session.user.id,
      provider: 'twitter',
    });

    logger.info(
      { userId: session.user.id, provider: 'twitter' },
      'Generated Twitter OAuth authorization URL'
    );

    // Redirect to Twitter authorization page
    return NextResponse.redirect(url);
  } catch (error) {
    logger.error({ error }, 'Failed to generate Twitter OAuth URL');
    return NextResponse.json(
      { error: 'Failed to initiate Twitter authorization' },
      { status: 500 }
    );
  }
}
