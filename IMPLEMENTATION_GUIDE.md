# Implementation Guide: New Reliability Infrastructure

This guide explains how to adopt the new reliability infrastructure that was added to improve the Social Cat automation platform. These dependencies provide production-ready job queuing, automatic retries, circuit breakers, and comprehensive logging.

## Table of Contents

1. [Overview of New Dependencies](#overview)
2. [Setup Instructions](#setup)
3. [Migrating from node-cron to BullMQ](#bullmq-migration)
4. [Adding Retry Logic to API Calls](#retry-logic)
5. [Implementing Circuit Breakers](#circuit-breakers)
6. [Using Rate Limiters](#rate-limiters)
7. [File Logging](#file-logging)
8. [Complete Examples](#examples)

---

## Overview of New Dependencies {#overview}

### What Was Added

| Package | Purpose | Key Benefits |
|---------|---------|--------------|
| **BullMQ** + **ioredis** | Persistent job queue with Redis | Jobs survive restarts, automatic retries, job history |
| **axios-retry** | Automatic HTTP retry logic | Exponential backoff, handles transient failures |
| **opossum** | Circuit breaker pattern | Prevents cascading failures when APIs are down |
| **bottleneck** | Advanced rate limiting | Coordinates rate limits across concurrent jobs |
| **pino-roll** | Rotating file logs | Persistent logs with automatic rotation |
| **p-timeout** + **p-retry** | Promise utilities | Timeout handling and custom retry logic |
| **sharp** | Image processing | Resize/optimize images for social media |
| **@bull-board** | Job queue dashboard | Web UI to view/manage jobs |

### Why These Are Critical

**Before:**
- Single API failure = entire workflow stops
- No job history or replay capability
- Jobs lost on server restart
- No visibility into failures
- Rate limits exceeded by concurrent jobs

**After:**
- Automatic retries with exponential backoff
- Jobs persist in Redis and can be replayed
- Complete job history and failure tracking
- Persistent logs for debugging
- Coordinated rate limiting across all jobs

---

## Setup Instructions {#setup}

### 1. Install Redis (Required for BullMQ)

**Option A: Local Redis (Development)**

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

**Option B: Cloud Redis (Production)**

- **Upstash**: Free tier, perfect for this use case
  - Visit https://upstash.com
  - Create new Redis database
  - Copy `REDIS_URL` to `.env`

- **Railway**: If deploying on Railway
  - Add Redis plugin to your project
  - Copy connection string to `REDIS_URL`

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Redis (required for BullMQ)
REDIS_URL=redis://localhost:6379  # or your cloud Redis URL

# Logging
LOG_LEVEL=info                    # debug, info, warn, error
ENABLE_FILE_LOGS=true             # Logs saved to logs/ directory

# Optional: Distributed rate limiting (multi-instance deployments)
ENABLE_DISTRIBUTED_RATE_LIMITING=false
```

### 3. Update .gitignore

Add to `.gitignore`:

```
# Logs
logs/
*.log

# Redis dump (if using local Redis)
dump.rdb
```

---

## Migrating from node-cron to BullMQ {#bullmq-migration}

### Before: node-cron (Current Implementation)

```typescript
// src/lib/jobs/index.ts - CURRENT
import { scheduler, ScheduledJob } from '../scheduler';

const jobs: ScheduledJob[] = [
  {
    name: 'reply-to-tweets',
    schedule: '0 */2 * * *',  // Every 2 hours
    task: replyToTweetsJob,
    enabled: false,
  },
];

scheduler.register(job);
scheduler.start();
```

**Problems:**
- Jobs lost on restart
- No retry if job fails
- No job history
- Can't manually trigger

### After: BullMQ (New Implementation)

```typescript
// src/lib/jobs/twitter-reply-bullmq.ts - NEW
import { createQueue, createWorker, addJob, QUEUE_NAMES } from '../queue';
import { replyToTweetsWorkflow } from '../workflows/twitter/reply-to-tweets';

// 1. Create queue
const twitterReplyQueue = createQueue(QUEUE_NAMES.TWITTER_REPLY);

// 2. Create worker to process jobs
createWorker(
  QUEUE_NAMES.TWITTER_REPLY,
  async (job) => {
    const { searchQuery } = job.data;
    await replyToTweetsWorkflow({ searchQuery, dryRun: false });
  },
  {
    concurrency: 1,  // Process one at a time
    limiter: {
      max: 1,
      duration: 2 * 60 * 60 * 1000,  // Max 1 job per 2 hours
    },
  }
);

// 3. Add repeating job (replaces cron)
await addJob(
  QUEUE_NAMES.TWITTER_REPLY,
  'reply-to-tweets',
  { searchQuery: process.env.TWITTER_REPLY_SEARCH_QUERY || 'AI' },
  {
    repeat: {
      pattern: '0 */2 * * *',  // Every 2 hours (cron pattern)
    },
  }
);
```

**Benefits:**
- ✅ Jobs persist in Redis (survive restarts)
- ✅ Automatic retries (3 attempts with exponential backoff)
- ✅ Job history kept for 24 hours
- ✅ Can manually trigger via API or Bull Board UI
- ✅ Failed jobs kept for 7 days for debugging

### Migration Steps

**Step 1:** Create new job file with BullMQ pattern

```typescript
// src/lib/jobs/[job-name]-bullmq.ts
import { createQueue, createWorker, addJob, QUEUE_NAMES } from '../queue';

export async function setupJobName() {
  const queue = createQueue(QUEUE_NAMES.YOUR_QUEUE);

  createWorker(QUEUE_NAMES.YOUR_QUEUE, async (job) => {
    // Your existing job logic here
    await yourExistingJobFunction();
  });

  // Add as repeating job
  await addJob(
    QUEUE_NAMES.YOUR_QUEUE,
    'your-job-name',
    {},
    {
      repeat: { pattern: '0 */2 * * *' },  // Your cron schedule
    }
  );
}
```

**Step 2:** Initialize in application startup

```typescript
// src/app/api/scheduler/route.ts or similar
import { setupJobName } from '@/lib/jobs/[job-name]-bullmq';
import { startAllWorkers } from '@/lib/queue';

export async function POST() {
  await setupJobName();
  await startAllWorkers();
  return Response.json({ success: true });
}
```

**Step 3:** Gradually migrate jobs one at a time

Both systems can run concurrently during migration. Keep node-cron running while you test BullMQ jobs.

---

## Adding Retry Logic to API Calls {#retry-logic}

### Before: No Retries

```typescript
// src/lib/twitter.ts - BEFORE
import axios from 'axios';

export async function searchTweets(query: string) {
  const response = await axios.get('https://api.twitter.com/2/tweets/search', {
    params: { query },
  });
  return response.data;
}
// ❌ Single network error = complete failure
```

### After: Automatic Retries

```typescript
// src/lib/twitter.ts - AFTER
import { twitterAxios } from './axios-config';

export async function searchTweets(query: string) {
  const response = await twitterAxios.get('https://api.twitter.com/2/tweets/search', {
    params: { query },
  });
  return response.data;
}
// ✅ Automatically retries 5 times with exponential backoff
// ✅ Handles 429 rate limits intelligently
// ✅ Logs all retry attempts
```

### Pre-configured Axios Instances

Replace `axios` imports with pre-configured instances:

```typescript
// Import the right one for your API
import {
  twitterAxios,      // Twitter API with rate limit handling
  youtubeAxios,      // YouTube API (conservative, quota-aware)
  openaiAxios,       // OpenAI (60s timeout for generation)
  instagramAxios,    // Instagram API
  rapidApiAxios,     // RapidAPI endpoints
  httpClient,        // Generic HTTP with retries
} from './axios-config';

// Use exactly like axios
const response = await twitterAxios.post('/endpoint', data);
```

### Custom Retry Configuration

```typescript
import { createAxiosWithRetry } from './axios-config';

const customAxios = createAxiosWithRetry({
  retries: 5,
  timeout: 30000,
  retryCondition: (error) => {
    // Custom logic: only retry on specific errors
    return error.response?.status === 503;
  },
  onRetry: (retryCount, error) => {
    console.log(`Retry attempt ${retryCount}: ${error.message}`);
  },
});
```

---

## Implementing Circuit Breakers {#circuit-breakers}

### What is a Circuit Breaker?

Prevents wasting requests on failing services. After N consecutive failures, the circuit "opens" and fails immediately instead of attempting the request.

**States:**
- **CLOSED** (normal): Requests go through
- **OPEN** (failing): Requests fail immediately without trying
- **HALF_OPEN** (testing): Trying to see if service recovered

### Before: Keep Hammering Failing API

```typescript
// BEFORE - If Twitter API is down, keeps trying every 2 hours
async function replyToTweetsJob() {
  const tweets = await searchTweets(query);  // Fails
  // Job fails, retries in 2 hours, fails again...
}
```

### After: Circuit Breaker Protection

```typescript
// AFTER - Opens circuit after 3 failures, stops wasting requests
import { createTwitterCircuitBreaker } from './resilience';

const searchTweetsWithBreaker = createTwitterCircuitBreaker(searchTweets);

async function replyToTweetsJob() {
  try {
    const tweets = await searchTweetsWithBreaker(query);
    // Process tweets...
  } catch (error) {
    // Circuit is open - service is down, fail fast
    logger.warn('Twitter API circuit is open, skipping job');
  }
}
```

### Wrapping Existing Functions

```typescript
// src/lib/twitter.ts
import { createTwitterCircuitBreaker } from './resilience';

// Original function
async function postTweetOriginal(text: string) {
  // ... implementation
}

// Wrap it
export const postTweet = createTwitterCircuitBreaker(postTweetOriginal);

// Use normally - circuit breaker is transparent
await postTweet('Hello world');
```

### Platform-Specific Breakers

```typescript
import {
  createTwitterCircuitBreaker,    // 15s timeout, 60s reset
  createYouTubeCircuitBreaker,    // 10s timeout, 2min reset
  createOpenAICircuitBreaker,     // 60s timeout (for generation)
  createInstagramCircuitBreaker,
  createRapidAPICircuitBreaker,
} from './resilience';

const getTrendsWithBreaker = createTwitterCircuitBreaker(getTrends);
const generateReplyWithBreaker = createOpenAICircuitBreaker(generateReply);
```

### Circuit Breaker with Fallback

```typescript
import { withFallback, createTwitterCircuitBreaker } from './resilience';

const getTrendsWithFallback = withFallback(
  createTwitterCircuitBreaker(getTrends),
  () => {
    // Fallback: return empty trends if API is down
    return { trends: [] };
  }
);

const trends = await getTrendsWithFallback();  // Never throws!
```

---

## Using Rate Limiters {#rate-limiters}

### Problem: Concurrent Jobs Exceed Rate Limits

```typescript
// BEFORE - Two jobs run at same time, both call Twitter API
// Job 1: Posts 10 tweets rapidly
// Job 2: Searches and replies to 20 tweets
// Result: 429 Rate Limit Exceeded
```

### Solution: Coordinated Rate Limiting

```typescript
// AFTER - All jobs share same rate limiter
import { twitterRateLimiter, withRateLimit } from './rate-limiter';

// Wrap your function
const postTweetRateLimited = withRateLimit(postTweet, twitterRateLimiter);

// Now both jobs share the same rate limit
async function job1() {
  for (const tweet of tweets) {
    await postTweetRateLimited(tweet.text);  // Queued if limit reached
  }
}

async function job2() {
  for (const tweet of searchResults) {
    await postTweetRateLimited(reply);  // Queued fairly after job1
  }
}
```

### Pre-configured Rate Limiters

```typescript
import {
  twitterRateLimiter,        // 300 req / 15min
  twitterUserRateLimiter,    // 50 actions / hour (posting)
  youtubeRateLimiter,        // 10,000 quota / day
  openaiRateLimiter,         // 500 req / min
  instagramRateLimiter,      // 200 calls / hour
  rapidApiRateLimiter,       // 100 req / min
} from './rate-limiter';
```

### Manual Scheduling

```typescript
// Schedule with priority
await twitterRateLimiter.schedule(
  { priority: 1 },  // High priority
  () => importantTweet()
);

await twitterRateLimiter.schedule(
  { priority: 5 },  // Low priority
  () => regularTweet()
);
```

### Checking Rate Limiter Status

```typescript
import { getRateLimiterStats } from './rate-limiter';

const stats = await getRateLimiterStats(twitterRateLimiter);
console.log(`Queued: ${stats.queued}, Running: ${stats.running}`);
```

---

## File Logging {#file-logging}

### What Changed

**Before:**
- Logs only in console
- Lost on restart
- Can't debug production issues

**After:**
- Logs saved to `logs/app.log` (all logs)
- Errors saved to `logs/error.log` (errors only)
- Daily rotation, keeps last 7 days
- 10MB size limit per file

### Log Files

```
logs/
├── app.log              # Current day
├── app.log.2025-10-19   # Previous days
├── app.log.2025-10-18
├── error.log            # Current errors
└── error.log.2025-10-19
```

### Using the Logger

```typescript
import { logger } from './lib/logger';

// Structured logging
logger.info({ tweetId: '123', text: 'Hello' }, 'Tweet posted');
logger.error({ error: err.message, userId: '456' }, 'Failed to post');
logger.warn({ queue: 'twitter', jobs: 10 }, 'Queue backing up');
logger.debug({ data: complexObject }, 'Debug info');

// Helper functions
import { logJobStart, logJobComplete, logJobError } from './lib/logger';

logJobStart('reply-to-tweets');
// ... do work
logJobComplete('reply-to-tweets', 1500);  // 1500ms duration
```

### Viewing Logs

```bash
# Tail all logs
tail -f logs/app.log

# Tail errors only
tail -f logs/error.log

# Search logs
grep "twitter" logs/app.log

# View with pretty formatting (if piped during development)
npm run dev | npx pino-pretty
```

### Configuration

```bash
# .env
LOG_LEVEL=debug              # Show debug logs
ENABLE_FILE_LOGS=false       # Disable file logs (console only)
```

---

## Complete Examples {#examples}

### Example 1: Migrating Twitter Reply Job

**Before (node-cron):**

```typescript
// src/lib/jobs/twitter-reply.ts - OLD
export async function replyToTweetsJob() {
  console.log('Starting reply job');

  const response = await axios.get('https://api.twitter.com/...');
  const tweets = response.data;

  for (const tweet of tweets) {
    const reply = await generateReply(tweet.text);
    await postReply(tweet.id, reply);
  }

  console.log('Job complete');
}

// src/lib/jobs/index.ts
{
  name: 'reply-to-tweets',
  schedule: '0 */2 * * *',
  task: replyToTweetsJob,
  enabled: false,
}
```

**After (BullMQ + Retry + Circuit Breaker + Rate Limiting):**

```typescript
// src/lib/jobs/twitter-reply-bullmq.ts - NEW
import { createQueue, createWorker, addJob, QUEUE_NAMES } from '../queue';
import { twitterAxios } from '../axios-config';
import { createTwitterCircuitBreaker, createOpenAICircuitBreaker } from '../resilience';
import { twitterRateLimiter, openaiRateLimiter, withRateLimit } from '../rate-limiter';
import { logger } from '../logger';

// Wrap API calls with circuit breakers
const searchTweetsProtected = createTwitterCircuitBreaker(
  async (query: string) => {
    const response = await twitterAxios.get('https://api.twitter.com/...');
    return response.data;
  }
);

const generateReplyProtected = createOpenAICircuitBreaker(generateReply);

// Wrap with rate limiters
const postReplyRateLimited = withRateLimit(postReply, twitterRateLimiter);
const generateReplyRateLimited = withRateLimit(
  generateReplyProtected,
  openaiRateLimiter
);

// Setup queue and worker
export async function setupTwitterReplyJob() {
  const queue = createQueue(QUEUE_NAMES.TWITTER_REPLY);

  createWorker(
    QUEUE_NAMES.TWITTER_REPLY,
    async (job) => {
      logger.info({ jobId: job.id }, 'Starting Twitter reply job');

      try {
        // Search tweets (with retry + circuit breaker)
        const tweets = await searchTweetsProtected(job.data.query);
        logger.info({ count: tweets.length }, 'Found tweets');

        // Process each tweet (rate limited)
        for (const tweet of tweets) {
          const reply = await generateReplyRateLimited(tweet.text);
          await postReplyRateLimited(tweet.id, reply);
          logger.info({ tweetId: tweet.id }, 'Posted reply');
        }

        logger.info('Twitter reply job complete');
      } catch (error) {
        logger.error({ error }, 'Twitter reply job failed');
        throw error;  // Will trigger automatic retry
      }
    },
    {
      concurrency: 1,
      limiter: {
        max: 1,
        duration: 2 * 60 * 60 * 1000,  // Max 1 job per 2 hours
      },
    }
  );

  // Add repeating job
  await addJob(
    QUEUE_NAMES.TWITTER_REPLY,
    'reply-to-tweets',
    { query: process.env.TWITTER_REPLY_SEARCH_QUERY || 'AI' },
    {
      repeat: { pattern: '0 */2 * * *' },
    }
  );

  logger.info('Twitter reply job setup complete');
}
```

**Initialize on startup:**

```typescript
// src/app/api/scheduler/route.ts
import { setupTwitterReplyJob } from '@/lib/jobs/twitter-reply-bullmq';
import { startAllWorkers } from '@/lib/queue';

export async function POST() {
  await setupTwitterReplyJob();
  await startAllWorkers();

  return Response.json({
    success: true,
    message: 'Jobs initialized with BullMQ'
  });
}
```

**Benefits:**
- ✅ Automatic retries on failure (3 attempts)
- ✅ Circuit breaker prevents hammering failing APIs
- ✅ Rate limiting prevents exceeding API limits
- ✅ Jobs persist and can be replayed
- ✅ Complete logging to files for debugging

---

### Example 2: Simple Migration Checklist

For each existing job, follow this pattern:

**1. Wrap API calls with retry:**
```typescript
// Before: import axios from 'axios';
// After:
import { twitterAxios } from './axios-config';
```

**2. Add circuit breaker:**
```typescript
import { createTwitterCircuitBreaker } from './resilience';
const myFunctionProtected = createTwitterCircuitBreaker(myFunction);
```

**3. Add rate limiting:**
```typescript
import { twitterRateLimiter, withRateLimit } from './rate-limiter';
const myFunctionRateLimited = withRateLimit(myFunctionProtected, twitterRateLimiter);
```

**4. Update logging:**
```typescript
// Before: console.log('Starting job');
// After:
import { logger } from './logger';
logger.info({ job: 'my-job' }, 'Starting job');
```

**5. Convert to BullMQ:**
```typescript
import { createQueue, createWorker, addJob } from './queue';
// ... follow BullMQ pattern from Example 1
```

---

## Testing Your Migration

### 1. Test Locally with Redis

```bash
# Start Redis
redis-server

# Start your app
npm run dev

# Trigger job manually via API
curl -X POST http://localhost:3000/api/scheduler
```

### 2. View Job Queue Dashboard

Install and configure Bull Board:

```typescript
// src/app/api/admin/queues/route.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { queues } from '@/lib/queue';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

createBullBoard({
  queues: Array.from(queues.values()).map(q => new BullMQAdapter(q)),
  serverAdapter,
});

export const GET = serverAdapter.getRouter();
```

Access at: `http://localhost:3000/api/admin/queues`

### 3. Check Logs

```bash
# Watch logs in real-time
tail -f logs/app.log

# Watch errors
tail -f logs/error.log

# Search for specific job
grep "twitter-reply" logs/app.log
```

---

## FAQ

**Q: Do I need to migrate everything at once?**
A: No! Both node-cron and BullMQ can run side-by-side. Migrate one job at a time.

**Q: Can I use BullMQ without Redis?**
A: No, BullMQ requires Redis. But you can keep using node-cron if Redis isn't available.

**Q: Will this slow down my API calls?**
A: Rate limiting may delay requests to prevent hitting API limits, but that's the point. Retries and circuit breakers actually improve overall reliability.

**Q: How do I manually trigger a job?**
A: Use the Bull Board UI or call `addJob()` directly:
```typescript
await addJob(QUEUE_NAMES.TWITTER_REPLY, 'manual-trigger', { query: 'test' });
```

**Q: What if I don't want file logs?**
A: Set `ENABLE_FILE_LOGS=false` in `.env`

**Q: How much does Upstash Redis cost?**
A: Free tier includes 10,000 commands/day, which is plenty for this use case.

---

## Next Steps

1. **Set up Redis** (local or cloud)
2. **Migrate one job** using the BullMQ pattern
3. **Test with dry-run mode** first
4. **Monitor logs** in `logs/app.log`
5. **Gradually migrate remaining jobs**
6. **Enable Bull Board** for job monitoring
7. **Deploy to production** with confidence

For questions or issues, check the logs in `logs/error.log` or review the configuration files in `src/lib/`.
