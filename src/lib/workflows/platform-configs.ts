/**
 * Platform Credential Configurations
 *
 * Defines the credential fields required for each platform/service.
 * Used by the credential form to dynamically render input fields.
 */

export interface CredentialFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'email' | 'url';
  placeholder?: string;
  required: boolean;
  description?: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  category: string;
  icon?: string;
  fields: CredentialFieldConfig[];
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  // ============================================
  // AI SERVICES
  // ============================================
  openai: {
    id: 'openai',
    name: 'OpenAI',
    category: 'AI',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        description: 'Your OpenAI API key from platform.openai.com'
      }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    category: 'AI',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
        description: 'Your Anthropic API key from console.anthropic.com'
      }
    ]
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    category: 'AI',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-or-v1-...',
        description: 'Your OpenRouter API key from openrouter.ai/keys - Access 300+ AI models from one API'
      }
    ]
  },

  cohere: {
    id: 'cohere',
    name: 'Cohere',
    category: 'AI',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  stabilityai: {
    id: 'stabilityai',
    name: 'Stability AI',
    category: 'AI',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  replicate: {
    id: 'replicate',
    name: 'Replicate',
    category: 'AI',
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', required: true }
    ]
  },

  huggingface: {
    id: 'huggingface',
    name: 'Hugging Face',
    category: 'AI',
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', required: true }
    ]
  },

  // ============================================
  // SOCIAL MEDIA
  // ============================================
  twitter_oauth2_app: {
    id: 'twitter_oauth2_app',
    name: 'Twitter OAuth 2.0 App Credentials',
    category: 'Social Media',
    fields: [
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        required: true,
        description: 'OAuth 2.0 Client ID from Twitter Developer Portal'
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        description: 'OAuth 2.0 Client Secret from Twitter Developer Portal'
      }
    ]
  },

  reddit: {
    id: 'reddit',
    name: 'Reddit',
    category: 'Social Media',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true }
    ]
  },

  youtube: {
    id: 'youtube',
    name: 'YouTube (OAuth)',
    category: 'Social Media',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ]
  },

  youtube_apikey: {
    id: 'youtube_apikey',
    name: 'YouTube (API Key)',
    category: 'Social Media',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'AIza...',
        description: 'API key from Google Cloud Console (for read-only operations)'
      }
    ]
  },

  instagram: {
    id: 'instagram',
    name: 'Instagram',
    category: 'Social Media',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true }
    ]
  },

  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    category: 'Social Media',
    fields: [
      { key: 'client_key', label: 'Client Key', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true }
    ]
  },

  // ============================================
  // COMMUNICATION
  // ============================================
  slack: {
    id: 'slack',
    name: 'Slack (Bot Token)',
    category: 'Communication',
    fields: [
      {
        key: 'bot_token',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: 'xoxb-...',
        description: 'Bot user token (simpler for team automation)'
      }
    ]
  },

  slack_oauth: {
    id: 'slack_oauth',
    name: 'Slack (OAuth User Token)',
    category: 'Communication',
    fields: [
      {
        key: 'user_token',
        label: 'User OAuth Token',
        type: 'password',
        required: true,
        placeholder: 'xoxp-...',
        description: 'User-level OAuth token for personal actions'
      }
    ]
  },

  discord: {
    id: 'discord',
    name: 'Discord (Bot Token)',
    category: 'Communication',
    fields: [
      {
        key: 'bot_token',
        label: 'Bot Token',
        type: 'password',
        required: true,
        description: 'Bot token from Discord Developer Portal (simpler for server automation)'
      }
    ]
  },

  discord_oauth: {
    id: 'discord_oauth',
    name: 'Discord (OAuth)',
    category: 'Communication',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, description: 'OAuth token for user-level actions' }
    ]
  },

  telegram: {
    id: 'telegram',
    name: 'Telegram',
    category: 'Communication',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true }
    ]
  },

  resend: {
    id: 'resend',
    name: 'Resend',
    category: 'Communication',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  twilio: {
    id: 'twilio',
    name: 'Twilio',
    category: 'Communication',
    fields: [
      { key: 'account_sid', label: 'Account SID', type: 'text', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: true },
      { key: 'phone_number', label: 'Phone Number', type: 'text', required: true, placeholder: '+1234567890' }
    ]
  },

  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    category: 'Communication',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true }
    ]
  },

  zendesk: {
    id: 'zendesk',
    name: 'Zendesk',
    category: 'Communication',
    fields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true, placeholder: 'yourcompany' },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'api_token', label: 'API Token', type: 'password', required: true }
    ]
  },

  intercom: {
    id: 'intercom',
    name: 'Intercom',
    category: 'Communication',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true }
    ]
  },

  freshdesk: {
    id: 'freshdesk',
    name: 'Freshdesk',
    category: 'Communication',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'text', required: true, placeholder: 'yourcompany.freshdesk.com' }
    ]
  },

  google_oauth_app: {
    id: 'google_oauth_app',
    name: 'Google OAuth App Credentials',
    category: 'Communication',
    fields: [
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        required: true,
        description: 'OAuth 2.0 Client ID from Google Cloud Console'
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        description: 'OAuth 2.0 Client Secret from Google Cloud Console'
      }
    ]
  },

  outlook_oauth_app: {
    id: 'outlook_oauth_app',
    name: 'Outlook OAuth App Credentials',
    category: 'Communication',
    fields: [
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        required: true,
        description: 'OAuth 2.0 Client ID from Microsoft Azure Portal'
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        description: 'OAuth 2.0 Client Secret from Microsoft Azure Portal'
      }
    ]
  },

  youtube_oauth_app: {
    id: 'youtube_oauth_app',
    name: 'YouTube OAuth App Credentials',
    category: 'Social Media',
    fields: [
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        required: true,
        description: 'OAuth 2.0 Client ID from Google Cloud Console'
      },
      {
        key: 'client_secret',
        label: 'Client Secret',
        type: 'password',
        required: true,
        description: 'OAuth 2.0 Client Secret from Google Cloud Console'
      }
    ]
  },

  // ============================================
  // DATA & DATABASES
  // ============================================
  airtable: {
    id: 'airtable',
    name: 'Airtable (Personal Access Token)',
    category: 'Data',
    fields: [
      {
        key: 'api_key',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'pat...',
        description: 'Personal token from Airtable account (simpler for personal bases)'
      }
    ]
  },

  gamma: {
    id: 'gamma',
    name: 'Gamma',
    category: 'Data',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'gamma_...',
        description: 'Your Gamma API key from gamma.app/settings/api'
      }
    ]
  },

  airtable_oauth: {
    id: 'airtable_oauth',
    name: 'Airtable (OAuth)',
    category: 'Data',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, description: 'OAuth token for multi-user apps' }
    ]
  },

  notion: {
    id: 'notion',
    name: 'Notion (Integration Token)',
    category: 'Data',
    fields: [
      {
        key: 'api_key',
        label: 'Integration Token',
        type: 'password',
        required: true,
        placeholder: 'secret_...',
        description: 'Internal integration token (simpler for single workspace)'
      }
    ]
  },

  notion_oauth: {
    id: 'notion_oauth',
    name: 'Notion (OAuth)',
    category: 'Data',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, description: 'OAuth access token for multi-workspace integrations' }
    ]
  },

  googlecalendar: {
    id: 'googlecalendar',
    name: 'Google Calendar (OAuth)',
    category: 'Productivity',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true, description: 'OAuth token for personal calendars' }
    ]
  },

  googlecalendar_serviceaccount: {
    id: 'googlecalendar_serviceaccount',
    name: 'Google Calendar (Service Account)',
    category: 'Productivity',
    fields: [
      { key: 'service_account_email', label: 'Service Account Email', type: 'email', required: true },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true, description: 'For domain-wide delegation and shared calendars' }
    ]
  },

  googlesheets: {
    id: 'googlesheets',
    name: 'Google Sheets (Service Account)',
    category: 'Data',
    fields: [
      { key: 'service_account_email', label: 'Service Account Email', type: 'email', required: true },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true, description: 'Paste the entire private key from your service account JSON (simpler for automation)' }
    ]
  },

  googlesheets_oauth: {
    id: 'googlesheets_oauth',
    name: 'Google Sheets (OAuth)',
    category: 'Data',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true, description: 'OAuth refresh token for user-level access' }
    ]
  },

  mongodb: {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'Data',
    fields: [
      { key: 'connection_string', label: 'Connection String', type: 'password', required: true, placeholder: 'mongodb://...' }
    ]
  },

  postgresql: {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'Data',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true },
      { key: 'port', label: 'Port', type: 'text', required: false, placeholder: '5432' },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'user', label: 'User', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true }
    ]
  },

  mysql: {
    id: 'mysql',
    name: 'MySQL',
    category: 'Data',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true },
      { key: 'port', label: 'Port', type: 'text', required: false, placeholder: '3306' },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'user', label: 'User', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true }
    ]
  },

  // ============================================
  // BUSINESS & CRM
  // ============================================
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot (Private App Token)',
    category: 'Business',
    fields: [
      {
        key: 'api_key',
        label: 'Private App Access Token',
        type: 'password',
        required: true,
        placeholder: 'pat-...',
        description: 'Private app token (simpler for single account)'
      }
    ]
  },

  hubspot_oauth: {
    id: 'hubspot_oauth',
    name: 'HubSpot (OAuth)',
    category: 'Business',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, description: 'OAuth token for public apps' }
    ]
  },

  salesforce: {
    id: 'salesforce',
    name: 'Salesforce (OAuth)',
    category: 'Business',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true, description: 'OAuth username-password flow' }
    ]
  },

  salesforce_jwt: {
    id: 'salesforce_jwt',
    name: 'Salesforce (JWT Bearer)',
    category: 'Business',
    fields: [
      { key: 'client_id', label: 'Consumer Key', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true, description: 'JWT private key for server-to-server authentication' }
    ]
  },

  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    category: 'Business',
    fields: [
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
      { key: 'company_domain', label: 'Company Domain', type: 'text', required: true, placeholder: 'yourcompany' }
    ]
  },

  gohighlevel: {
    id: 'gohighlevel',
    name: 'GoHighLevel (OAuth 2.0)',
    category: 'Business',
    fields: [
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: true,
        placeholder: 'eyJ...',
        description: 'OAuth 2.0 access token from GHL (valid for 24 hours)'
      },
      {
        key: 'refresh_token',
        label: 'Refresh Token',
        type: 'password',
        required: false,
        description: 'OAuth 2.0 refresh token for automatic token renewal'
      },
      {
        key: 'location_id',
        label: 'Location ID',
        type: 'text',
        required: false,
        placeholder: 'loc_...',
        description: 'Default location ID (can be overridden per request)'
      }
    ]
  },

  // ============================================
  // PAYMENTS
  // ============================================
  stripe: {
    id: 'stripe',
    name: 'Stripe (Secret Key)',
    category: 'Payments',
    fields: [
      {
        key: 'secret_key',
        label: 'Secret Key',
        type: 'password',
        required: true,
        placeholder: 'sk_...',
        description: 'Direct secret key (simpler for single account)'
      }
    ]
  },

  stripe_connect: {
    id: 'stripe_connect',
    name: 'Stripe (Connect/OAuth)',
    category: 'Payments',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, description: 'OAuth Connect token for marketplace platforms' }
    ]
  },

  square: {
    id: 'square',
    name: 'Square',
    category: 'Payments',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'location_id', label: 'Location ID', type: 'text', required: true }
    ]
  },

  // ============================================
  // E-COMMERCE
  // ============================================
  shopify: {
    id: 'shopify',
    name: 'Shopify',
    category: 'E-commerce',
    fields: [
      { key: 'shop_name', label: 'Shop Name', type: 'text', required: true, placeholder: 'yourstore' },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'api_version', label: 'API Version', type: 'text', required: false, placeholder: '2024-01' }
    ]
  },

  woocommerce: {
    id: 'woocommerce',
    name: 'WooCommerce',
    category: 'E-commerce',
    fields: [
      { key: 'url', label: 'Store URL', type: 'url', required: true, placeholder: 'https://yourstore.com' },
      { key: 'consumer_key', label: 'Consumer Key', type: 'text', required: true },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', required: true }
    ]
  },

  // ============================================
  // DEVELOPER TOOLS
  // ============================================
  github: {
    id: 'github',
    name: 'GitHub (Personal Access Token)',
    category: 'Developer Tools',
    fields: [
      {
        key: 'token',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'ghp_...',
        description: 'Personal Access Token from GitHub settings (simpler for automation)'
      }
    ]
  },

  github_oauth: {
    id: 'github_oauth',
    name: 'GitHub (OAuth App)',
    category: 'Developer Tools',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true, description: 'OAuth access token for user operations' }
    ]
  },

  vercel: {
    id: 'vercel',
    name: 'Vercel',
    category: 'Developer Tools',
    fields: [
      { key: 'token', label: 'API Token', type: 'password', required: true }
    ]
  },

  netlify: {
    id: 'netlify',
    name: 'Netlify',
    category: 'Developer Tools',
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', required: true }
    ]
  },

  sentry: {
    id: 'sentry',
    name: 'Sentry',
    category: 'Developer Tools',
    fields: [
      { key: 'dsn', label: 'DSN', type: 'url', required: true },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: false }
    ]
  },

  datadog: {
    id: 'datadog',
    name: 'Datadog',
    category: 'Developer Tools',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'app_key', label: 'Application Key', type: 'password', required: true }
    ]
  },

  // ============================================
  // VIDEO & MEDIA
  // ============================================
  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'Video & Media',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  cloudinary: {
    id: 'cloudinary',
    name: 'Cloudinary',
    category: 'Video & Media',
    fields: [
      { key: 'cloud_name', label: 'Cloud Name', type: 'text', required: true },
      { key: 'api_key', label: 'API Key', type: 'text', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true }
    ]
  },

  heygen: {
    id: 'heygen',
    name: 'HeyGen',
    category: 'Video & Media',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  runway: {
    id: 'runway',
    name: 'Runway',
    category: 'Video & Media',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  synthesia: {
    id: 'synthesia',
    name: 'Synthesia',
    category: 'Video & Media',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  vimeo: {
    id: 'vimeo',
    name: 'Vimeo',
    category: 'Video & Media',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true }
    ]
  },

  // ============================================
  // LEAD GENERATION
  // ============================================
  clearbit: {
    id: 'clearbit',
    name: 'Clearbit',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  hunter: {
    id: 'hunter',
    name: 'Hunter.io',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  apollo: {
    id: 'apollo',
    name: 'Apollo.io',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  lusha: {
    id: 'lusha',
    name: 'Lusha',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  // ============================================
  // CONTENT & MEDIA
  // ============================================
  unsplash: {
    id: 'unsplash',
    name: 'Unsplash',
    category: 'Content',
    fields: [
      { key: 'access_key', label: 'Access Key', type: 'password', required: true }
    ]
  },

  pexels: {
    id: 'pexels',
    name: 'Pexels',
    category: 'Content',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  medium: {
    id: 'medium',
    name: 'Medium',
    category: 'Content',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true }
    ]
  },

  bannerbear: {
    id: 'bannerbear',
    name: 'Bannerbear',
    category: 'Content',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  placid: {
    id: 'placid',
    name: 'Placid',
    category: 'Content',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  canva: {
    id: 'canva',
    name: 'Canva',
    category: 'Content',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  ghost: {
    id: 'ghost',
    name: 'Ghost CMS',
    category: 'Content',
    fields: [
      { key: 'url', label: 'Ghost URL', type: 'url', required: true, placeholder: 'https://yourblog.ghost.io' },
      { key: 'admin_api_key', label: 'Admin API Key', type: 'password', required: true }
    ]
  },

  // ============================================
  // VECTOR DATABASES
  // ============================================
  pinecone: {
    id: 'pinecone',
    name: 'Pinecone',
    category: 'AI',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  weaviate: {
    id: 'weaviate',
    name: 'Weaviate',
    category: 'AI',
    fields: [
      { key: 'url', label: 'Weaviate URL', type: 'url', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  chromadb: {
    id: 'chromadb',
    name: 'ChromaDB',
    category: 'AI',
    fields: [
      { key: 'url', label: 'ChromaDB URL', type: 'url', required: true, placeholder: 'http://localhost:8000' }
    ]
  },

  // ============================================
  // AUDIO & MUSIC
  // ============================================
  suno: {
    id: 'suno',
    name: 'Suno AI',
    category: 'AI',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  mubert: {
    id: 'mubert',
    name: 'Mubert',
    category: 'AI',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  // ============================================
  // MORE E-COMMERCE
  // ============================================
  etsy: {
    id: 'etsy',
    name: 'Etsy',
    category: 'E-commerce',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', required: true },
      { key: 'shop_id', label: 'Shop ID', type: 'text', required: true }
    ]
  },

  ebay: {
    id: 'ebay',
    name: 'eBay',
    category: 'E-commerce',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ]
  },

  amazonsp: {
    id: 'amazonsp',
    name: 'Amazon Seller Partner',
    category: 'E-commerce',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ]
  },

  printful: {
    id: 'printful',
    name: 'Printful',
    category: 'E-commerce',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  // ============================================
  // MORE BUSINESS/ACCOUNTING
  // ============================================
  quickbooks: {
    id: 'quickbooks',
    name: 'QuickBooks',
    category: 'Business',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ]
  },

  xero: {
    id: 'xero',
    name: 'Xero',
    category: 'Business',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ]
  },

  freshbooks: {
    id: 'freshbooks',
    name: 'FreshBooks',
    category: 'Business',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ]
  },

  docusign: {
    id: 'docusign',
    name: 'DocuSign',
    category: 'Business',
    fields: [
      { key: 'integration_key', label: 'Integration Key', type: 'text', required: true },
      { key: 'user_id', label: 'User ID', type: 'text', required: true },
      { key: 'private_key', label: 'Private Key', type: 'textarea', required: true }
    ]
  },

  hellosign: {
    id: 'hellosign',
    name: 'HelloSign',
    category: 'Business',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  // ============================================
  // MORE DEVELOPER TOOLS
  // ============================================
  heroku: {
    id: 'heroku',
    name: 'Heroku',
    category: 'Developer Tools',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  circleci: {
    id: 'circleci',
    name: 'CircleCI',
    category: 'Developer Tools',
    fields: [
      { key: 'token', label: 'Personal API Token', type: 'password', required: true }
    ]
  },

  jenkins: {
    id: 'jenkins',
    name: 'Jenkins',
    category: 'Developer Tools',
    fields: [
      { key: 'url', label: 'Jenkins URL', type: 'url', required: true },
      { key: 'user', label: 'Username', type: 'text', required: true },
      { key: 'token', label: 'API Token', type: 'password', required: true }
    ]
  },

  // ============================================
  // MORE COMMUNICATION
  // ============================================
  firebase: {
    id: 'firebase',
    name: 'Firebase',
    category: 'Communication',
    fields: [
      { key: 'service_account', label: 'Service Account JSON', type: 'textarea', required: true }
    ]
  },

  onesignal: {
    id: 'onesignal',
    name: 'OneSignal',
    category: 'Communication',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', required: true },
      { key: 'rest_api_key', label: 'REST API Key', type: 'password', required: true }
    ]
  },

  // ============================================
  // DATA PROCESSING
  // ============================================
  bigquery: {
    id: 'bigquery',
    name: 'Google BigQuery',
    category: 'Data',
    fields: [
      { key: 'project_id', label: 'Project ID', type: 'text', required: true },
      { key: 'credentials', label: 'Service Account JSON', type: 'textarea', required: true }
    ]
  },

  snowflake: {
    id: 'snowflake',
    name: 'Snowflake',
    category: 'Data',
    fields: [
      { key: 'account', label: 'Account', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'warehouse', label: 'Warehouse', type: 'text', required: true }
    ]
  },

  redshift: {
    id: 'redshift',
    name: 'Amazon Redshift',
    category: 'Data',
    fields: [
      { key: 'host', label: 'Host', type: 'text', required: true },
      { key: 'port', label: 'Port', type: 'text', required: false, placeholder: '5439' },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'user', label: 'User', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true }
    ]
  },

  kafka: {
    id: 'kafka',
    name: 'Apache Kafka',
    category: 'Data',
    fields: [
      { key: 'brokers', label: 'Brokers (comma-separated)', type: 'text', required: true, placeholder: 'broker1:9092,broker2:9092' },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true }
    ]
  },

  rabbitmq: {
    id: 'rabbitmq',
    name: 'RabbitMQ',
    category: 'Data',
    fields: [
      { key: 'url', label: 'Connection URL', type: 'password', required: true, placeholder: 'amqp://localhost:5672' }
    ]
  },

  // ============================================
  // MORE LEAD GENERATION
  // ============================================
  zoominfo: {
    id: 'zoominfo',
    name: 'ZoomInfo',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true }
    ]
  },

  proxycurl: {
    id: 'proxycurl',
    name: 'Proxycurl',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  phantombuster: {
    id: 'phantombuster',
    name: 'PhantomBuster',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  apify: {
    id: 'apify',
    name: 'Apify',
    category: 'Lead Generation',
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', required: true }
    ]
  },

  // ============================================
  // ANALYTICS
  // ============================================
  googleanalytics: {
    id: 'googleanalytics',
    name: 'Google Analytics',
    category: 'Analytics',
    fields: [
      {
        key: 'credentials',
        label: 'Service Account JSON',
        type: 'textarea',
        required: true,
        description: 'Service account credentials from Google Cloud Console'
      },
      {
        key: 'property_id',
        label: 'GA4 Property ID',
        type: 'text',
        required: true,
        placeholder: '123456789',
        description: 'Your GA4 property ID (found in Admin > Property Settings)'
      }
    ]
  },

  algolia: {
    id: 'algolia',
    name: 'Algolia',
    category: 'Analytics',
    fields: [
      { key: 'app_id', label: 'Application ID', type: 'text', required: true },
      { key: 'api_key', label: 'Admin API Key', type: 'password', required: true },
      {
        key: 'index_name',
        label: 'Default Index Name',
        type: 'text',
        required: false,
        description: 'Optional default index (can be overridden per operation)'
      }
    ]
  },

  // ============================================
  // EMAIL MARKETING
  // ============================================
  mailchimp: {
    id: 'mailchimp',
    name: 'Mailchimp',
    category: 'Email Marketing',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      {
        key: 'server_prefix',
        label: 'Server Prefix',
        type: 'text',
        required: true,
        placeholder: 'us1',
        description: 'Server prefix from your API key (e.g., us1, us2, etc.)'
      }
    ]
  },

  // ============================================
  // PRODUCTIVITY & PROJECT MANAGEMENT
  // ============================================
  linear: {
    id: 'linear',
    name: 'Linear',
    category: 'Productivity',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        description: 'Personal API key from Linear Settings'
      }
    ]
  },

  typeform: {
    id: 'typeform',
    name: 'Typeform',
    category: 'Productivity',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        description: 'Personal access token from Typeform account'
      }
    ]
  },

  calendly: {
    id: 'calendly',
    name: 'Calendly',
    category: 'Productivity',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        description: 'Personal access token from Calendly integrations'
      }
    ]
  },

  // ============================================
  // CLOUD STORAGE
  // ============================================
  googledrive: {
    id: 'googledrive',
    name: 'Google Drive (Service Account)',
    category: 'Cloud Storage',
    fields: [
      {
        key: 'credentials',
        label: 'Service Account JSON',
        type: 'textarea',
        required: true,
        description: 'Service account credentials from Google Cloud Console'
      }
    ]
  },

  googledrive_oauth: {
    id: 'googledrive_oauth',
    name: 'Google Drive (OAuth)',
    category: 'Cloud Storage',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true }
    ]
  },

  // ============================================
  // DESIGN TOOLS
  // ============================================
  figma: {
    id: 'figma',
    name: 'Figma',
    category: 'Design Tools',
    fields: [
      {
        key: 'access_token',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        description: 'Personal access token from Figma account settings'
      }
    ]
  },

  // ============================================
  // SOCIAL MEDIA (ADDITIONAL)
  // ============================================
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'Social Media',
    fields: [
      {
        key: 'access_token',
        label: 'Access Token',
        type: 'password',
        required: true,
        description: 'OAuth 2.0 access token for LinkedIn API'
      }
    ]
  },

  // ============================================
  // ENTERPRISE COMMUNICATION
  // ============================================
  microsoftteams: {
    id: 'microsoftteams',
    name: 'Microsoft Teams',
    category: 'Communication',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      {
        key: 'tenant_id',
        label: 'Tenant ID',
        type: 'text',
        required: true,
        description: 'Azure AD tenant ID'
      }
    ]
  },

  // ============================================
  // GENERAL
  // ============================================
  rapidapi: {
    id: 'rapidapi',
    name: 'RapidAPI',
    category: 'General',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true }
    ]
  },

  custom: {
    id: 'custom',
    name: 'Custom',
    category: 'General',
    fields: [
      { key: 'value', label: 'API Key / Token', type: 'password', required: true }
    ]
  },

  // ============================================
  // MCP (MODEL CONTEXT PROTOCOL) SERVERS
  // ============================================
  tavily: {
    id: 'tavily',
    name: 'Tavily Search',
    category: 'MCP',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'tvly-...',
        description: 'Your Tavily API key from tavily.com'
      }
    ]
  },

  brave: {
    id: 'brave',
    name: 'Brave Search',
    category: 'MCP',
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        description: 'Your Brave Search API key from brave.com/search/api'
      }
    ]
  },

  postgres_connection: {
    id: 'postgres_connection',
    name: 'PostgreSQL Connection',
    category: 'MCP',
    fields: [
      {
        key: 'connection_string',
        label: 'Connection String',
        type: 'password',
        required: true,
        placeholder: 'postgresql://user:pass@host:5432/dbname',
        description: 'PostgreSQL connection string'
      }
    ]
  },

  github_token: {
    id: 'github_token',
    name: 'GitHub Token (MCP)',
    category: 'MCP',
    fields: [
      {
        key: 'token',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'ghp_...',
        description: 'GitHub Personal Access Token with repo permissions'
      }
    ]
  },

  slack_bot: {
    id: 'slack_bot',
    name: 'Slack Bot',
    category: 'MCP',
    fields: [
      {
        key: 'bot_token',
        label: 'Bot Token',
        type: 'password',
        required: true,
        placeholder: 'xoxb-...',
        description: 'Slack Bot User OAuth Token'
      },
      {
        key: 'team_id',
        label: 'Team ID',
        type: 'text',
        required: true,
        placeholder: 'T0123456789',
        description: 'Your Slack Team/Workspace ID'
      }
    ]
  },

  google_oauth: {
    id: 'google_oauth',
    name: 'Google OAuth',
    category: 'MCP',
    fields: [
      {
        key: 'oauth_token',
        label: 'OAuth Token',
        type: 'password',
        required: true,
        description: 'Google OAuth access token for Drive access'
      }
    ]
  },
};

/**
 * Get platform config by ID
 */
export function getPlatformConfig(platformId: string): PlatformConfig | undefined {
  return PLATFORM_CONFIGS[platformId.toLowerCase()];
}

/**
 * Get all platforms grouped by category
 */
export function getPlatformsByCategory(): Record<string, PlatformConfig[]> {
  const grouped: Record<string, PlatformConfig[]> = {};

  Object.values(PLATFORM_CONFIGS).forEach(config => {
    if (!grouped[config.category]) {
      grouped[config.category] = [];
    }
    grouped[config.category].push(config);
  });

  // Sort platforms within each category
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  return grouped;
}

/**
 * Get all category names
 */
export function getCategories(): string[] {
  const categories = new Set<string>();
  Object.values(PLATFORM_CONFIGS).forEach(config => categories.add(config.category));
  return Array.from(categories).sort();
}
