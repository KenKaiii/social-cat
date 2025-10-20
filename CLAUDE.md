# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social Cat is a Next.js 15 social media automation platform that manages posting and engagement across Twitter/X, YouTube, and Instagram. It features AI-powered content generation and replies, scheduled automation using cron jobs, and a workflow pipeline system for multi-step automations.

## Development Commands

### Development Server
```bash
npm run dev          # Start dev server with Turbopack
npm start            # Start production server
npm run build        # Build for production with Turbopack
```

### Testing
```bash
npm test             # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run test:run     # Run tests once
```

### Database (Drizzle ORM)
```bash
npm run db:generate  # Generate migrations from schema
npm run db:migrate   # Run migrations
npm run db:push      # Push schema changes directly
npm run db:studio    # Open Drizzle Studio
```

### Linting
```bash
npm run lint         # Run ESLint
```

## Architecture

### Database Layer
- **Dual Database Support**: Automatically switches between SQLite (local development) and PostgreSQL (production) based on `DATABASE_URL` environment variable
- **Schema Location**: `src/lib/schema.ts` contains duplicate table definitions for both SQLite and PostgreSQL
- **Database Client**: `src/lib/db.ts` exports `db` (the active database client) and `useSQLite` (boolean flag)
- **Tables**: tweets, ai_responses, users, accounts, sessions, verification_tokens, youtube_videos, youtube_comments
- **Connection Details**: SQLite uses `local.db` file; PostgreSQL configured via `DATABASE_URL` from Railway

### Authentication
- **NextAuth v5 (Auth.js)**: Simple credentials-based authentication for single-user app
- **Configuration**: `src/lib/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`
- **Strategy**: JWT sessions with 30-day max age
- **Credentials**: Stored in environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- **Protected Routes**: Use `auth()` from `src/lib/auth.ts` to protect routes

### Scheduler System
- **Implementation**: Node-cron based scheduler in `src/lib/scheduler.ts`
- **Job Registration**: All jobs defined in `src/lib/jobs/index.ts`
- **Cron Patterns**: Standard cron expressions (e.g., `*/5 * * * *` for every 5 minutes)
- **Enable/Disable**: Jobs have `enabled` flag; set to `false` by default to prevent accidental posting
- **Job Types**: Twitter AI posting, tweet replies, YouTube comment replies, trend analysis
- **Initialization**: Call `initializeScheduler()` from `src/lib/jobs/index.ts` to start all jobs

### Workflow Pipeline System
- **Core Class**: `Pipeline` in `src/lib/workflows/Pipeline.ts`
- **Pattern**: Sequential step execution with data passing between steps
- **Error Handling**: Stops on first error unless `continueOnError: true`
- **Logging**: Structured logging with pino logger for each step
- **Usage Pattern**:
  ```typescript
  const result = await createPipeline<ContextType>()
    .step('step-name', async (ctx) => { /* logic */ return updatedCtx; })
    .step('next-step', async (ctx) => { /* logic */ return updatedCtx; })
    .execute(initialContext);
  ```
- **Workflows Location**: `src/lib/workflows/` organized by platform (twitter, youtube, instagram)
- **Example Workflow**: `reply-to-tweets.ts` shows search → rank → generate AI reply → post pattern

### API Routes
- **Authentication**: `/api/auth/[...nextauth]` - NextAuth endpoints
- **Scheduler**: `/api/scheduler` - Start/stop scheduler
- **Jobs**: `/api/jobs/trigger` - Manually trigger specific jobs
- **Workflows**: `/api/workflows/test-reply` - Test tweet reply workflow without posting

### External API Integrations
- **Twitter**: `src/lib/twitter.ts` (Twitter API v2) and `src/lib/rapidapi/twitter/` (RapidAPI Twitter AIO for search)
- **YouTube**: `src/lib/youtube.ts` (Google APIs OAuth flow)
- **Instagram**: `src/lib/instagram.ts` (Meta Graph API) and `src/lib/rapidapi/instagram/` (RapidAPI)
- **OpenAI**: `src/lib/openai.ts` for AI content generation and replies
- **Rate Limiting**: `src/lib/ratelimit.ts` using Upstash Redis (optional in production)

### Environment Configuration
- **Validation**: Type-safe env validation using `@t3-oss/env-nextjs` in `src/env.ts`
- **Required Variables**: `AUTH_SECRET` (always required)
- **Optional Variables**: All API keys and tokens are optional; features gracefully degrade if missing
- **Database**: Empty `DATABASE_URL` = SQLite; set value = PostgreSQL
- **Example File**: `.env.example` contains all possible environment variables with documentation

### UI Components
- **Component Library**: shadcn/ui with Radix UI primitives
- **Location**: `src/components/ui/` for base components
- **Layout**: `src/components/layout/` for DashboardLayout and Navbar
- **Automation**: `src/components/automation/` for automation control UI
- **Styling**: Tailwind CSS 4 with path alias `@/` → `src/`

### Pages
- **Home**: `/` - Landing page
- **Dashboard**: `/dashboard` - Main automation dashboard
- **Platform Pages**: `/twitter`, `/youtube`, `/instagram` - Platform-specific configuration
- **Settings**: `/settings` - User settings
- **Test UI**: `/dashboard/test-replies` - Test tweet reply workflow with dry-run mode

### Reliability Infrastructure (NEW)

Production-ready infrastructure for autopilot operation. All components are optional but highly recommended for production deployment.

#### BullMQ Job Queue (`src/lib/queue.ts`)
- **Purpose**: Persistent job queue with Redis backend
- **Replaces**: node-cron for production use (both can coexist during migration)
- **Features**:
  - Jobs survive server restarts
  - Automatic retries with exponential backoff (3 attempts by default)
  - Job history (completed: 24 hours, failed: 7 days)
  - Manual job triggering and replay
  - Priority queues and rate limiting per queue
- **Setup**: Requires Redis (local or cloud like Upstash)
- **Queue Names**: Exported in `QUEUE_NAMES` constant
- **Functions**: `createQueue()`, `createWorker()`, `addJob()`, `startAllWorkers()`
- **Migration Guide**: See `IMPLEMENTATION_GUIDE.md`

#### Circuit Breaker Pattern (`src/lib/resilience.ts`)
- **Purpose**: Prevents cascading failures when external APIs are down
- **How It Works**: After N consecutive failures, stops attempting requests (fails fast)
- **States**: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
- **Pre-configured Breakers**:
  - `createTwitterCircuitBreaker()` - 15s timeout, 60s reset delay
  - `createYouTubeCircuitBreaker()` - 10s timeout, 2min reset delay
  - `createOpenAICircuitBreaker()` - 60s timeout (for AI generation)
  - `createInstagramCircuitBreaker()`, `createRapidAPICircuitBreaker()`
- **Usage**: Wrap existing functions: `const fn = createTwitterCircuitBreaker(originalFn)`
- **Fallbacks**: Use `withFallback()` to provide default responses when circuit is open

#### Automatic Retries (`src/lib/axios-config.ts`)
- **Purpose**: Automatic retry logic for HTTP requests with exponential backoff
- **Replaces**: Raw `axios` imports
- **Pre-configured Instances**:
  - `twitterAxios` - 5 retries, handles 429 rate limits intelligently
  - `youtubeAxios` - 3 retries, conservative (quota-aware)
  - `openaiAxios` - 60s timeout for AI generation
  - `instagramAxios`, `rapidApiAxios`, `httpClient`
- **Features**:
  - Exponential backoff: 2^attempt × 1000ms
  - Respects `retry-after` headers
  - Request/response logging
  - Retry only on retryable errors (network, 5xx, 429)
- **Usage**: Replace `axios.get(url)` with `twitterAxios.get(url)`
- **Custom Config**: `createAxiosWithRetry({ retries: 5, timeout: 30000 })`

#### Rate Limiting (`src/lib/rate-limiter.ts`)
- **Purpose**: Coordinate API rate limits across concurrent jobs
- **Library**: Bottleneck with optional Redis clustering
- **Pre-configured Limiters**:
  - `twitterRateLimiter` - 300 req/15min (app-level limit)
  - `twitterUserRateLimiter` - 50 actions/hour (user-level posting)
  - `youtubeRateLimiter` - 10,000 quota units/day
  - `openaiRateLimiter` - 500 req/min
  - `instagramRateLimiter` - 200 calls/hour
- **Features**:
  - Token bucket algorithm with reservoir refresh
  - Priority queues (lower number = higher priority)
  - Fair distribution across concurrent jobs
  - Optional distributed rate limiting with Redis
- **Usage**: `withRateLimit(fn, twitterRateLimiter)` or `limiter.schedule(() => fn())`
- **Stats**: `getRateLimiterStats(limiter)` shows queued/running jobs

#### Persistent Logging (`src/lib/logger.ts`)
- **Purpose**: Structured logging with automatic file rotation
- **Library**: Pino + pino-roll
- **Log Files**:
  - `logs/app.log` - All logs (info and above)
  - `logs/error.log` - Errors only
  - Rotation: Daily at midnight + 10MB size limit
  - Retention: Last 7 days automatically kept
- **Streams**: Console (development) + Files (production)
- **Configuration**:
  - `LOG_LEVEL` env var (debug, info, warn, error)
  - `ENABLE_FILE_LOGS` to disable file logging
- **Usage**:
  ```typescript
  import { logger } from './lib/logger';
  logger.info({ tweetId: '123' }, 'Tweet posted');
  logger.error({ error, userId }, 'Failed to post');
  ```
- **Helpers**: `logJobStart()`, `logJobComplete()`, `logJobError()`

#### Image Processing (`sharp` - installed but not integrated)
- **Purpose**: Resize, optimize, and convert images for social media
- **Library**: Sharp (high-performance native library)
- **Use Cases**:
  - Resize images to platform requirements (Twitter: max 5MB, 4096×4096)
  - Convert formats (HEIC → JPG, PNG → JPG)
  - Optimize file sizes for faster uploads
- **Status**: Package installed, awaiting integration with media workflows

#### Redis Configuration
- **Required For**: BullMQ job queue
- **Optional For**: Distributed rate limiting across multiple instances
- **Local Setup**: `brew install redis && brew services start redis`
- **Cloud Options**:
  - Upstash (free tier: 10,000 commands/day)
  - Railway Redis plugin
- **Environment Variables**:
  - `REDIS_URL` - Full connection string (overrides host/port)
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Individual settings

## Important Patterns

### Creating New Jobs
1. Define job function in `src/lib/jobs/your-job.ts`
2. Export function from `src/lib/jobs/index.ts`
3. Add to `jobs` array in `src/lib/jobs/index.ts` with cron schedule
4. Set `enabled: false` by default to prevent accidental execution

### Creating New Workflows
1. Create workflow file in `src/lib/workflows/platform/your-workflow.ts`
2. Use `createPipeline()` pattern with typed context
3. Export workflow function from `src/lib/workflows/index.ts`
4. Each step should be self-contained and return updated context
5. Use logger for structured logging instead of console.log

### Database Schema Changes
1. Modify BOTH SQLite and PostgreSQL table definitions in `src/lib/schema.ts`
2. Run `npm run db:generate` to create migration files
3. Run `npm run db:migrate` (production) or `npm run db:push` (development)
4. Update TypeScript types (auto-inferred from schema)

### Adding New Platform Integrations
1. Create API client in `src/lib/platform-name.ts`
2. Add RapidAPI integrations in `src/lib/rapidapi/platform-name/`
3. Create workflows in `src/lib/workflows/platform-name/`
4. Add scheduled jobs in `src/lib/jobs/`
5. Update environment variables in `src/env.ts` and `.env.example`

### Using Reliability Infrastructure (RECOMMENDED)

When creating new API calls, jobs, or workflows, follow these patterns for production reliability:

#### Pattern 1: API Calls with Retry + Circuit Breaker
```typescript
// Step 1: Use pre-configured axios instance (automatic retries)
import { twitterAxios } from '@/lib/axios-config';

// Step 2: Wrap with circuit breaker
import { createTwitterCircuitBreaker } from '@/lib/resilience';

const searchTweetsRaw = async (query: string) => {
  const response = await twitterAxios.get('/endpoint', { params: { query } });
  return response.data;
};

export const searchTweets = createTwitterCircuitBreaker(searchTweetsRaw);
```

#### Pattern 2: Rate-Limited API Calls
```typescript
import { twitterRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { createTwitterCircuitBreaker } from '@/lib/resilience';

const postTweetRaw = async (text: string) => { /* ... */ };
const postTweetWithBreaker = createTwitterCircuitBreaker(postTweetRaw);
export const postTweet = withRateLimit(postTweetWithBreaker, twitterRateLimiter);

// Usage: Automatically rate limited and protected
await postTweet('Hello world');
```

#### Pattern 3: BullMQ Job (Replaces node-cron)
```typescript
import { createQueue, createWorker, addJob, QUEUE_NAMES } from '@/lib/queue';
import { logger } from '@/lib/logger';

export async function setupMyJob() {
  const queue = createQueue(QUEUE_NAMES.MY_QUEUE);

  createWorker(QUEUE_NAMES.MY_QUEUE, async (job) => {
    logger.info({ jobId: job.id }, 'Starting job');

    // Your job logic here (with retries, circuit breakers, rate limiting)
    await myWorkflow(job.data);

    logger.info({ jobId: job.id }, 'Job complete');
  });

  // Add repeating job (cron-style)
  await addJob(QUEUE_NAMES.MY_QUEUE, 'my-job', {}, {
    repeat: { pattern: '0 */2 * * *' }  // Every 2 hours
  });
}
```

#### Pattern 4: Complete Production-Ready Job
```typescript
// Combines all reliability patterns
import { createQueue, createWorker, addJob } from '@/lib/queue';
import { twitterAxios } from '@/lib/axios-config';
import { createTwitterCircuitBreaker } from '@/lib/resilience';
import { twitterRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

// API call with retries + circuit breaker + rate limiting
const apiCall = withRateLimit(
  createTwitterCircuitBreaker(async () => {
    const res = await twitterAxios.get('/endpoint');
    return res.data;
  }),
  twitterRateLimiter
);

// Job with persistence + history
export async function setupProductionJob() {
  createWorker('my-queue', async (job) => {
    logger.info({ jobId: job.id }, 'Job started');
    try {
      const data = await apiCall();  // Protected & rate limited
      logger.info({ count: data.length }, 'Data fetched');
    } catch (error) {
      logger.error({ error }, 'Job failed');
      throw error;  // Triggers automatic retry
    }
  });

  await addJob('my-queue', 'job-name', {}, {
    repeat: { pattern: '0 */4 * * *' },
    priority: 1,  // High priority
  });
}
```

#### Quick Migration Checklist
For existing code, apply these changes incrementally:

1. **Logging**: Replace `console.log` → `logger.info()`, `console.error` → `logger.error()`
2. **HTTP Calls**: Replace `axios` → `twitterAxios` (or appropriate pre-configured instance)
3. **Circuit Breakers**: Wrap API functions with `createTwitterCircuitBreaker(fn)`
4. **Rate Limiting**: Wrap with `withRateLimit(fn, twitterRateLimiter)`
5. **Jobs**: Migrate from node-cron to BullMQ (see `IMPLEMENTATION_GUIDE.md`)

**Complete Example Migration**: See `IMPLEMENTATION_GUIDE.md` Example 1 for full before/after comparison.

## Testing and Safety

### Dry Run Mode
- Workflows support `dryRun: true` option to test without posting to social platforms
- Example: `/dashboard/test-replies` page demonstrates dry-run testing
- Always test workflows in dry-run mode before enabling scheduled jobs

### Manual Job Triggering
- Use `/api/jobs/trigger` endpoint to manually run jobs for testing
- Prevents waiting for cron schedule during development
- Jobs are disabled by default; must explicitly enable in `src/lib/jobs/index.ts`

### Rate Limiting
- Optional Upstash Redis rate limiting configured in `src/lib/ratelimit.ts`
- Only active if `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Protects API routes from abuse in production

## Deployment

### Railway (Production)
- Set `DATABASE_URL` to PostgreSQL connection string
- Automatically switches from SQLite to PostgreSQL
- Set all required API keys and tokens as environment variables
- Run migrations: `npm run db:migrate`

### Local Development
- Leave `DATABASE_URL` empty to use SQLite
- SQLite database stored in `local.db` file
- Minimal setup: Only `AUTH_SECRET` required to start
- Generate secret: `openssl rand -base64 32`
