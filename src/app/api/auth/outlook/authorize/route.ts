import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { oauthStateTable, userCredentialsTable } from '@/lib/schema';
import { logger } from '@/lib/logger';
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Microsoft Outlook OAuth 2.0 Authorization Endpoint
 *
 * Generates an OAuth 2.0 authorization URL and redirects the user to Microsoft
 * to authorize the application for Outlook access.
 *
 * Flow:
 * 1. Check if user is authenticated
 * 2. Generate OAuth 2.0 authorization link
 * 3. Store state in database for verification
 * 4. Redirect user to Microsoft authorization page
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

    // Get Outlook OAuth app credentials from database
    const [appCred] = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.platform, 'outlook_oauth_app'))
      .limit(1);

    if (!appCred) {
      logger.error('Outlook OAuth app credentials not configured');
      return NextResponse.json(
        { error: 'Outlook OAuth app not configured. Please add Outlook OAuth App Credentials in the credentials page.' },
        { status: 500 }
      );
    }

    // Get client credentials
    let clientId: string;
    try {
      const creds = getOAuthAppCredentials(appCred, 'Outlook');
      clientId = creds.clientId;
    } catch (error) {
      logger.error({ error }, 'Failed to get Outlook OAuth app credentials');
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid Outlook OAuth app credentials' },
        { status: 500 }
      );
    }

    // Generate callback URL
    const callbackUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/api/auth/outlook/callback`
      : 'http://localhost:3123/api/auth/outlook/callback';

    // Generate random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in database
    await db.insert(oauthStateTable).values({
      state,
      codeVerifier: '', // Microsoft doesn't require PKCE for this flow
      userId: session.user.id,
      provider: 'outlook',
    });

    // Build Microsoft OAuth URL
    const scopes = [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/User.Read',
      'offline_access', // Required for refresh token
    ];

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('response_mode', 'query');

    logger.info(
      { userId: session.user.id, provider: 'outlook' },
      'Generated Microsoft OAuth authorization URL'
    );

    // Redirect to Microsoft authorization page
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    logger.error({ error }, 'Failed to generate Microsoft OAuth URL');
    return NextResponse.json(
      { error: 'Failed to initiate Microsoft authorization' },
      { status: 500 }
    );
  }
}
