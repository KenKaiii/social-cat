import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import {
  workflowsTable, accountsTable, userCredentialsTable
} from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { analyzeWorkflowCredentials, getPlatformDisplayName, getPlatformIcon } from '@/lib/workflows/analyze-credentials';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: workflowId } = await params;

    // Get workflow
    const workflows = await db
      .select()
      .from(workflowsTable)
      .where(
        and(
          eq(workflowsTable.id, workflowId),
          eq(workflowsTable.userId, session.user.id)
        )
      )
      .limit(1);

    if (workflows.length === 0) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const workflow = workflows[0];

    // Parse config if it's a string
    let config: {
      steps: Array<{
        id: string;
        module?: string;
        inputs?: Record<string, unknown>;
      }>;
    };

    if (typeof workflow.config === 'string') {
      try {
        config = JSON.parse(workflow.config);
      } catch (error) {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            workflowId,
            action: 'workflow_config_parse_failed'
          },
          'Failed to parse workflow config'
        );
        return NextResponse.json(
          { error: 'Invalid workflow configuration' },
          { status: 500 }
        );
      }
    } else {
      config = workflow.config as typeof config;
    }

    // Analyze required credentials (pass trigger to detect chat workflows)
    const requiredCredentials = analyzeWorkflowCredentials(config, workflow.trigger);

    // Get OAuth accounts (can have multiple per platform)
    const oauthAccounts: Record<string, Array<{ id: string; accountName: string; isExpired: boolean }>> = {};
    try {
      const accounts = await db
        .select()
        .from(accountsTable)
        .where(eq(accountsTable.userId, session.user.id));

      for (const account of accounts) {
        if (!oauthAccounts[account.provider]) {
          oauthAccounts[account.provider] = [];
        }
        if (account.access_token) {
          // Check if expired (expires_at is Unix timestamp in seconds, Date.now() is in milliseconds)
          const isExpired = account.expires_at ? (account.expires_at * 1000) < Date.now() : false;
          oauthAccounts[account.provider].push({
            id: account.id,
            accountName: account.account_name || account.providerAccountId,
            isExpired,
          });
        }
      }
    } catch (error) {
      // Accounts table might not exist - this is fine, we'll just use API keys
      logger.debug(
        {
          error: error instanceof Error ? error.message : String(error),
          workflowId,
          action: 'oauth_accounts_fetch_skipped'
        },
        'OAuth accounts not available (table may not exist)'
      );
    }

    // Get API keys (can have multiple per platform)
    const apiKeys: Record<string, Array<{ id: string; name: string }>> = {};
    const keys = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, session.user.id));

    for (const key of keys) {
      if (!apiKeys[key.platform]) {
        apiKeys[key.platform] = [];
      }
      if (key.encryptedValue) {
        apiKeys[key.platform].push({
          id: key.id,
          name: key.name,
        });
      }
    }

    // Platform aliases for credential lookup
    // Maps platform names (from analyze-credentials) to actual credential IDs (from platform-configs)
    const platformAliases: Record<string, string[]> = {
      'gmail': ['google'], // Gmail modules use Google OAuth
      'outlook': ['outlook'], // Outlook modules use Outlook OAuth
      'youtube': ['youtube_apikey', 'youtube'],
      'twitter': ['twitter_oauth2', 'twitter_oauth', 'twitter'],
      'twitter-oauth': ['twitter_oauth2', 'twitter_oauth', 'twitter'], // For social.twitter-oauth.* module paths
      'github': ['github_oauth', 'github'],
      'google-sheets': ['googlesheets', 'googlesheets_oauth'],
      'googlesheets': ['googlesheets', 'googlesheets_oauth'],
      'google-calendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'googlecalendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'google-drive': ['googledrive', 'googledrive_oauth'], // For data.google-drive.* module paths
      'googledrive': ['googledrive', 'googledrive_oauth'],
      'google-analytics': ['googleanalytics'], // For data.google-analytics.* module paths
      'googleanalytics': ['googleanalytics'],
      'microsoft-teams': ['microsoftteams'], // For communication.microsoft-teams.* module paths
      'microsoftteams': ['microsoftteams'],
      'amazon-sp': ['amazonsp'], // For ecommerce.amazon-sp.* module paths
      'amazonsp': ['amazonsp'],
      'notion': ['notion_oauth', 'notion'],
      'airtable': ['airtable_oauth', 'airtable'],
      'hubspot': ['hubspot_oauth', 'hubspot'],
      'salesforce': ['salesforce_jwt', 'salesforce'],
      'slack': ['slack_oauth', 'slack'],
      'discord': ['discord_oauth', 'discord'],
      'stripe': ['stripe_connect', 'stripe'],
      'rapidapi': ['rapidapi_api_key', 'rapidapi'],
      'openai': ['openai_api_key', 'openai'],
      'anthropic': ['anthropic_api_key', 'anthropic'],
    };

    // Build credential status list
    const credentials = requiredCredentials.map((cred) => {
      // Check both the exact platform name and any aliases
      const platformsToCheck = [cred.platform, ...(platformAliases[cred.platform] || [])];

      let accounts: Array<{ id: string; accountName: string; isExpired: boolean }> = [];
      let keys: Array<{ id: string; name: string }> = [];

      // Collect accounts and keys from all matching platforms (deduplicate by ID)
      const accountsMap = new Map<string, { id: string; accountName: string; isExpired: boolean }>();
      const keysMap = new Map<string, { id: string; name: string }>();

      for (const platform of platformsToCheck) {
        (oauthAccounts[platform] || []).forEach(acc => accountsMap.set(acc.id, acc));
        (apiKeys[platform] || []).forEach(key => keysMap.set(key.id, key));
      }

      accounts = Array.from(accountsMap.values());
      keys = Array.from(keysMap.values());

      // Determine connection status based on credential type
      let connected = false;
      if (cred.type === 'oauth') {
        connected = accounts.length > 0;
      } else if (cred.type === 'api_key') {
        connected = keys.length > 0;
      } else if (cred.type === 'both' || cred.type === 'optional') {
        // For 'both' and 'optional', connected if EITHER OAuth or API key is available
        connected = accounts.length > 0 || keys.length > 0;
      }

      // Map module platform names to OAuth endpoint names
      // E.g., 'twitter-oauth' -> 'twitter' for /api/auth/twitter/authorize
      const oauthPlatformMap: Record<string, string> = {
        'gmail': 'google',
        'outlook': 'outlook',
        'twitter-oauth': 'twitter',
        'google-sheets': 'googlesheets',
        'google-calendar': 'googlecalendar',
        'google-drive': 'googledrive',
        'google-analytics': 'googleanalytics',
        'microsoft-teams': 'microsoftteams',
        'amazon-sp': 'amazonsp',
      };

      return {
        platform: cred.platform,
        type: cred.type,
        displayName: getPlatformDisplayName(cred.platform),
        icon: getPlatformIcon(cred.platform),
        connected,
        accounts,
        keys,
        preferredType: cred.preferredType,
        oauthPlatform: oauthPlatformMap[cred.platform] || cred.platform, // Map to actual OAuth endpoint
      };
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    const { id: workflowId } = await params;
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        workflowId,
        action: 'workflow_credentials_fetch_failed'
      },
      'Error fetching workflow credentials'
    );
    // Return empty credentials array instead of error to avoid breaking the UI
    return NextResponse.json({ credentials: [] });
  }
}
