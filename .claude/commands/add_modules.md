# Add New Module

Create a new module for b0t with proper credential handling and system integration.

## Quick Start

```bash
# 1. Create module file
src/modules/[category]/[service].ts

# 2. Add to category index (check pattern below)
src/modules/[category]/index.ts

# 3. If needs credentials: update 4 files (see below)

# 4. Run checks
npm run modules:generate-registry
npm run typecheck
npm run lint
```

## Export Pattern (Step 2)

Add to `src/modules/[category]/index.ts`:

**Direct export** (utilities, communication, data, ai, devtools):
```typescript
export * from './myservice';
```

**Namespace export** (social, business, productivity, ecommerce, content, leads):
```typescript
export * as myservice from './myservice';
```

Check existing index.ts in your category to match the pattern.

## Module Template

```typescript
import { z } from 'zod';
import { createRateLimiter } from '@/lib/rate-limiter';
import { createCircuitBreaker } from '@/lib/resilience';
import { logger } from '@/lib/logger';

// Rate limiter
const rateLimiter = createRateLimiter({
  maxConcurrent: 5,
  minTime: 200
});

// Input validation
const inputSchema = z.object({
  param: z.string(),
  apiKey: z.string().optional()
});

/**
 * Does something useful
 * @example
 * const result = await doSomething({ param: 'value', apiKey: 'key' });
 */
async function doSomethingInternal(input: z.infer<typeof inputSchema>) {
  const validated = inputSchema.parse(input);

  if (!validated.apiKey) {
    throw new Error('API key required. Add credentials in Settings.');
  }

  // Implementation
  logger.info('Doing something', { param: validated.param });
  return { success: true };
}

const withBreaker = createCircuitBreaker(doSomethingInternal);
export const doSomething = (input: z.infer<typeof inputSchema>) =>
  rateLimiter(() => withBreaker.fire(input));
```

## Credential Integration (4 Files)

Only if your module needs credentials:

### 1. Platform Config (`src/lib/workflows/platform-configs.ts`)

```typescript
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  // ... existing configs ...

  myservice: {
    id: 'myservice',
    name: 'My Service',
    category: 'Communication',  // AI, Social, Communication, Data, etc.
    fields: [
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-...',
        description: 'From myservice.com/settings'
      }
    ]
  }
};
```

### 2. Credential Capabilities (`src/lib/workflows/analyze-credentials.ts`)

```typescript
// Add to PLATFORM_CAPABILITIES (line ~30)
const PLATFORM_CAPABILITIES: Record<string, PlatformCapability> = {
  myservice: {
    category: 'api_key',  // 'api_key' | 'oauth' | 'both' | 'optional' | 'none'
    functionRequirements: {
      'sendMessage': 'api_key',
      'listMessages': 'none'  // Read-only, no auth needed
    }
  },
};

// Add display name (line ~200)
export function getPlatformDisplayName(platform: string): string {
  const names: Record<string, string> = {
    myservice: 'My Service',
  };
}

// Add icon (line ~250)
export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    myservice: 'MessageSquare',  // Lucide icon name
  };
}
```

### 3. Platform Aliases (`src/lib/workflows/executor.ts` line ~868)

```typescript
const platformAliases: Record<string, string[]> = {
  'myservice': ['myservice_api_key', 'myservice'],
};
```

### 4. Credential API Aliases (`src/app/api/workflows/[id]/credentials/route.ts` line ~129)

```typescript
const platformAliases: Record<string, string[]> = {
  'myservice': ['myservice_api_key', 'myservice'],
};

// If OAuth, add to oauthPlatformMap (line ~193)
const oauthPlatformMap: Record<string, string> = {
  'myservice': 'myservice',  // Maps to /api/auth/myservice
};
```

## Categories

- `ai` - AI/ML (OpenAI, Anthropic, image/video gen)
- `social` - Social media (Twitter, YouTube, Instagram)
- `communication` - Messaging (Slack, Discord, Email)
- `business` - CRM, accounting (Salesforce, Stripe)
- `productivity` - Project management, notes
- `data` - Databases, storage
- `utilities` - HTTP, string, array, datetime (no credentials)
- `content` - Content generation
- `devtools` - Developer tools
- `ecommerce` - Shopping platforms
- `payments` - Payment processing
- `video` - Video processing
- `dataprocessing` - Data transformation
- `external-apis` - Third-party APIs
- `leads` - Lead generation
- `mcp` - Model Context Protocol servers

## Workflow Usage

Credentials auto-injected via variable interpolation:

```json
{
  "steps": [
    {
      "id": "send-msg",
      "module": "communication.myservice.sendMessage",
      "inputs": {
        "text": "Hello {{user.name}}",
        "apiKey": "{{credential.myservice}}"
      }
    }
  ]
}
```

## No Credentials Needed?

Skip credential integration entirely. Just create the module file with utilities pattern:

```typescript
export async function processData(input: string) {
  return input.toUpperCase();
}
```

## Checklist

- [ ] Create `src/modules/[category]/[service].ts`
- [ ] Export from `src/modules/[category]/index.ts`
- [ ] Add JSDoc with `@example` tags
- [ ] Include rate limiter + circuit breaker
- [ ] Zod schemas for validation
- [ ] If needs credentials: update 4 files above
- [ ] Run `npm run modules:generate-registry`
- [ ] Run `npm run typecheck && npm run lint`
- [ ] Test module in workflow

## Examples

**With credentials:** `src/modules/social/twitter.ts`, `src/modules/ai/anthropic.ts`
**No credentials:** `src/modules/utilities/array-utils.ts`, `src/modules/utilities/datetime.ts`
