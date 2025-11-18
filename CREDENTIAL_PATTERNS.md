# Credential Reference Patterns

**Quick reference for using credentials correctly in workflows and modules.**

---

## Core Principles

1. **OAuth modules** use `accessToken` parameter
2. **API Key modules** use `apiKey` parameter
3. **Platform names** use kebab-case with dashes (e.g., `twitter-oauth`)
4. **Credential references** use the base platform name (e.g., `{{credential.twitter}}`)

---

## Platform Aliases (Automatic Resolution)

The system automatically resolves credential references via platform aliases:

| Workflow Reference | Resolves To (in order) | Source |
|-------------------|------------------------|--------|
| `{{credential.twitter}}` | `twitter_oauth2`, `twitter_oauth`, `twitter` | accounts table |
| `{{credential.twitter-oauth}}` | `twitter_oauth2`, `twitter_oauth`, `twitter` | accounts table |
| `{{credential.openai}}` | `openai_api_key`, `openai` | user_credentials table |
| `{{credential.anthropic}}` | `anthropic_api_key`, `anthropic` | user_credentials table |
| `{{credential.rapidapi}}` | `rapidapi_api_key`, `rapidapi` | user_credentials table |
| `{{credential.youtube}}` | `youtube_apikey`, `youtube_api_key`, `youtube` | both tables |
| `{{credential.google-sheets}}` | `googlesheets`, `googlesheets_oauth` | both tables |

**Files with aliases**:
- `src/lib/workflows/executor.ts` (line 868)
- `src/lib/workflows/executor-stream.ts` (line 817)
- `src/app/api/workflows/[id]/credentials/route.ts` (line 129)

---

## Twitter OAuth - Complete Pattern

### Module Path
```
social.twitter-oauth.replyToTweet
```

### Workflow Reference
```json
{
  "module": "social.twitter-oauth.replyToTweet",
  "inputs": {
    "params": {
      "tweetId": "123456",
      "text": "Hello!",
      "accessToken": "{{credential.twitter}}"
    }
  }
}
```

### Metadata
```json
{
  "requiresCredentials": ["twitter-oauth"]
}
```

### Credential Storage

**App Credentials** (for OAuth flow):
- Platform: `twitter_oauth2_app`
- Type: `multi_field`
- Fields: `client_id`, `client_secret`
- Location: `user_credentials` table

**User Token** (from OAuth):
- Provider: `twitter`
- Type: OAuth access token
- Location: `accounts` table
- Created by: OAuth flow at `/api/auth/twitter/authorize` → `/api/auth/twitter/callback`

---

## Common Patterns

### OAuth Modules (Social, Communication)

**Pattern**: Use `accessToken` parameter
```json
{
  "module": "social.twitter-oauth.replyToTweet",
  "inputs": {
    "params": {
      "accessToken": "{{credential.twitter}}"
    }
  }
}
```

**Platforms**: Twitter OAuth, Gmail, Outlook, YouTube (write ops), GoHighLevel

---

### API Key Modules (AI, External APIs)

**Pattern**: Use `apiKey` parameter in `options`
```json
{
  "module": "ai.ai-sdk.generateText",
  "inputs": {
    "options": {
      "apiKey": "{{credential.openai_api_key}}"
    }
  }
}
```

**Platforms**: OpenAI, Anthropic, RapidAPI, Hunter, Apollo, ElevenLabs, etc.

---

### RapidAPI Services

**Pattern**: Always pass `apiKey` in params
```json
{
  "module": "external-apis.rapidapi-twitter.searchTwitter",
  "inputs": {
    "params": {
      "query": "AI",
      "apiKey": "{{credential.rapidapi_api_key}}"
    }
  }
}
```

---

## OAuth App Credentials (Multi-Field Format)

### How to Store

All OAuth app credentials use **multi-field format**:

**Platform naming**:
- Twitter: `twitter_oauth2_app`
- Google: `google_oauth_app`
- YouTube: `youtube_oauth_app`
- Outlook: `outlook_oauth_app`

**Storage format**:
```typescript
{
  platform: 'twitter_oauth2_app',
  type: 'multi_field',
  fields: {
    client_id: 'YOUR_CLIENT_ID',
    client_secret: 'YOUR_CLIENT_SECRET'
  }
}
```

### How It's Stored in Database

- `user_credentials.encrypted_value`: Empty string
- `user_credentials.metadata`: JSON string containing:
  ```json
  {
    "fields": {
      "client_id": "encrypted_value_here",
      "client_secret": "encrypted_value_here"
    }
  }
  ```

### How to Read (in OAuth routes)

Use the helper function:
```typescript
import { getOAuthAppCredentials } from '@/lib/oauth-credential-helper';

const { clientId, clientSecret } = getOAuthAppCredentials(appCred, 'Twitter');
```

**This handles**:
- Parsing metadata from JSON string
- Extracting fields object
- Decrypting individual fields
- Proper error handling

---

## Credential Variable Syntax

### In Workflow JSON

```json
{
  "apiKey": "{{credential.openai_api_key}}",
  "accessToken": "{{credential.twitter}}",
  "token": "{{credential.github}}"
}
```

### Alternative Syntaxes (all work)

```json
"{{credential.platform}}"
"{{user.platform}}"
"{{platform}}"
```

All three resolve to the same credential via the executor's context initialization.

---

## Analyze Credentials Platform Categories

### OAuth Only
`gmail`, `outlook`, `instagram`, `tiktok`, `linkedin`, `facebook`, `twitter-oauth`, `gohighlevel`

### API Key Only
`openai`, `anthropic`, `rapidapi`, `telegram`, `hunter`, `apollo`, `clearbit`, `linear`, `elevenlabs`

### Both (OAuth OR API Key)
`youtube`, `twitter`, `github`, `google-sheets`, `google-calendar`, `notion`, `airtable`, `hubspot`, `salesforce`, `slack`, `discord`, `stripe`, `google-drive`, `microsoft-teams`

### No Credentials
`rss`, `http`, `scraper`, `datetime`, `filesystem`, `csv`, `json-transform`, `compression`, `encryption`, `xml`, `pdf`, `image`, `drizzle-utils`

---

## Best Practices for LLM-Generated Workflows

### ✅ DO

1. Use `{{credential.platform}}` for the cleanest syntax
2. Use platform base names (e.g., `twitter` not `twitter_oauth2`)
3. Reference modules by full path: `social.twitter-oauth.replyToTweet`
4. Set `requiresCredentials` metadata with kebab-case platform names

### ❌ DON'T

1. Don't use `twitter_oauth` or `twitter_oauth2` directly - use `twitter`
2. Don't mix credential field names (use `apiKey` for API keys, `accessToken` for OAuth)
3. Don't use underscores in metadata platform names - use dashes (`twitter-oauth` not `twitter_oauth`)

---

## Example: Complete Twitter OAuth Workflow

```json
{
  "version": "1.0",
  "name": "Reply to Tweet",
  "config": {
    "steps": [
      {
        "id": "reply",
        "module": "social.twitter-oauth.replyToTweet",
        "inputs": {
          "params": {
            "tweetId": "123456",
            "text": "Great tweet!",
            "accessToken": "{{credential.twitter}}"
          }
        }
      }
    ]
  },
  "metadata": {
    "requiresCredentials": ["twitter-oauth"]
  }
}
```

**This works because**:
1. Module path: `social.twitter-oauth` → analyzer detects `twitter-oauth` platform
2. Metadata: `"twitter-oauth"` → UI shows "Connect Twitter" button
3. Variable: `{{credential.twitter}}` → executor resolves to OAuth token from accounts table
4. Platform aliases: `twitter-oauth` → `['twitter_oauth2', 'twitter_oauth', 'twitter']`
