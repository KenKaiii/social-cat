import Bottleneck from 'bottleneck';
import { Redis } from 'ioredis';
import { logger } from './logger';

/**
 * Advanced Rate Limiting with Bottleneck
 *
 * Coordinates rate limiting across:
 * - Multiple jobs running concurrently
 * - Different API endpoints with different limits
 * - Distributed systems (optional Redis clustering)
 *
 * Prevents API rate limit violations by:
 * - Queueing requests when limit reached
 * - Automatic retries after cooldown
 * - Fair distribution across concurrent jobs
 *
 * API Limits Reference:
 * - Twitter: 300 requests per 15 minutes (app-level)
 * - YouTube: 10,000 quota units per day
 * - OpenAI: Depends on tier (RPM/TPM limits)
 * - Instagram: 200 calls per hour per user
 */

interface RateLimiterConfig {
  maxConcurrent?: number;      // Max concurrent requests (default: 1)
  minTime?: number;            // Min time between requests in ms (default: 0)
  reservoir?: number;          // Max requests in time window
  reservoirRefreshAmount?: number; // How many tokens to add on refresh
  reservoirRefreshInterval?: number; // Refresh interval in ms
  id?: string;                 // Unique ID for Redis clustering
}

/**
 * Create a rate limiter with custom configuration
 */
export function createRateLimiter(config: RateLimiterConfig): Bottleneck {
  const {
    maxConcurrent = 1,
    minTime = 0,
    reservoir,
    reservoirRefreshAmount,
    reservoirRefreshInterval,
    id = 'default',
  } = config;

  // Build config with optional Redis support
  let limiterConfig: Bottleneck.ConstructorOptions = {
    maxConcurrent,
    minTime,
    reservoir,
    reservoirRefreshAmount,
    reservoirRefreshInterval,
    id,
  };

  // Optional: Use Redis for distributed rate limiting
  if (process.env.REDIS_URL && process.env.ENABLE_DISTRIBUTED_RATE_LIMITING === 'true') {
    const redis = new Redis(process.env.REDIS_URL);
    limiterConfig = {
      ...limiterConfig,
      datastore: 'ioredis',
      clientOptions: redis.options,
    };
  }

  const limiter = new Bottleneck(limiterConfig);

  // Event listeners
  limiter.on('failed', async (error, jobInfo) => {
    logger.warn(
      { error, jobInfo, limiterId: id },
      `Rate limiter job failed: ${error.message}`
    );

    // Retry after 5 seconds on rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return 5000; // Retry after 5 seconds
    }
  });

  limiter.on('retry', (error, jobInfo) => {
    logger.info(
      { error, jobInfo, limiterId: id },
      'Rate limiter retrying job'
    );
  });

  limiter.on('depleted', () => {
    logger.warn({ limiterId: id }, 'Rate limiter reservoir depleted');
  });

  limiter.on('debug', (message, data) => {
    logger.debug({ limiterId: id, message, data }, 'Rate limiter debug');
  });

  return limiter;
}

/**
 * Pre-configured rate limiters for each API
 */

// Twitter API Rate Limiter
// App-level: 300 requests per 15 minutes = 20 per minute = 1 every 3 seconds
export const twitterRateLimiter = createRateLimiter({
  maxConcurrent: 1,
  minTime: 3000,                // Min 3 seconds between requests
  reservoir: 300,                // 300 requests
  reservoirRefreshAmount: 300,   // Refill to 300
  reservoirRefreshInterval: 15 * 60 * 1000, // Every 15 minutes
  id: 'twitter-api',
});

// Twitter User-Level Rate Limiter (stricter)
// User-level posting: More conservative to avoid suspicion
export const twitterUserRateLimiter = createRateLimiter({
  maxConcurrent: 1,
  minTime: 30000,                // Min 30 seconds between user actions
  reservoir: 50,                 // 50 actions
  reservoirRefreshAmount: 50,
  reservoirRefreshInterval: 60 * 60 * 1000, // Per hour
  id: 'twitter-user',
});

// YouTube API Rate Limiter
// Quota-based: 10,000 units per day
// Read operations: 1 unit, Write operations: 50 units
// Conservative: 1 request every 10 seconds = max 8,640 requests/day
export const youtubeRateLimiter = createRateLimiter({
  maxConcurrent: 1,
  minTime: 10000,                // Min 10 seconds between requests
  reservoir: 10000,              // 10,000 quota units
  reservoirRefreshAmount: 10000,
  reservoirRefreshInterval: 24 * 60 * 60 * 1000, // Per day
  id: 'youtube-api',
});

// OpenAI API Rate Limiter
// Tier 1: 500 RPM (requests per minute)
// Conservative: 1 request every 150ms = ~400 RPM
export const openaiRateLimiter = createRateLimiter({
  maxConcurrent: 3,              // Allow 3 concurrent (API supports it)
  minTime: 150,                  // Min 150ms between requests
  reservoir: 500,                // 500 requests
  reservoirRefreshAmount: 500,
  reservoirRefreshInterval: 60 * 1000, // Per minute
  id: 'openai-api',
});

// Instagram API Rate Limiter
// 200 calls per hour per user
export const instagramRateLimiter = createRateLimiter({
  maxConcurrent: 1,
  minTime: 20000,                // Min 20 seconds between requests
  reservoir: 200,
  reservoirRefreshAmount: 200,
  reservoirRefreshInterval: 60 * 60 * 1000, // Per hour
  id: 'instagram-api',
});

// RapidAPI Rate Limiter
// Varies by plan, default: Basic plan limits
export const rapidApiRateLimiter = createRateLimiter({
  maxConcurrent: 1,
  minTime: 1000,                 // Min 1 second between requests
  reservoir: 100,                // Adjust based on your plan
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60 * 1000, // Per minute
  id: 'rapidapi',
});

/**
 * Wrap a function with rate limiting
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withRateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiter: Bottleneck
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return limiter.schedule(() => fn(...args)) as Promise<ReturnType<T>>;
  };
}

/**
 * Get rate limiter statistics
 */
export async function getRateLimiterStats(limiter: Bottleneck) {
  const counts = limiter.counts();

  return {
    running: counts.RUNNING,     // Currently executing
    queued: counts.QUEUED,       // Waiting in queue
    executing: counts.EXECUTING, // Being executed
    done: counts.DONE,           // Completed
  };
}

/**
 * Update rate limiter reservoir (useful for dynamic limits)
 */
export async function updateReservoir(
  limiter: Bottleneck,
  newReservoir: number
) {
  await limiter.updateSettings({
    reservoir: newReservoir,
  });
  logger.info({ newReservoir }, 'Updated rate limiter reservoir');
}

/**
 * Stop all rate limiters gracefully
 */
export async function stopAllRateLimiters() {
  const limiters = [
    twitterRateLimiter,
    twitterUserRateLimiter,
    youtubeRateLimiter,
    openaiRateLimiter,
    instagramRateLimiter,
    rapidApiRateLimiter,
  ];

  logger.info('Stopping all rate limiters');

  for (const limiter of limiters) {
    await limiter.stop({ dropWaitingJobs: false }); // Complete queued jobs
  }

  logger.info('All rate limiters stopped');
}

/**
 * Example usage:
 *
 * // Wrap an API function
 * const rateLimitedPostTweet = withRateLimit(postTweet, twitterRateLimiter);
 *
 * // Use it normally - automatically rate limited
 * await rateLimitedPostTweet('Hello world');
 *
 * // Manual scheduling
 * await twitterRateLimiter.schedule(() => postTweet('Hello'));
 *
 * // Priority jobs (lower number = higher priority)
 * await twitterRateLimiter.schedule({ priority: 1 }, () => importantTweet());
 * await twitterRateLimiter.schedule({ priority: 5 }, () => regularTweet());
 *
 * // Check stats
 * const stats = await getRateLimiterStats(twitterRateLimiter);
 * console.log(`Queued: ${stats.queued}, Running: ${stats.running}`);
 *
 * // Graceful shutdown
 * process.on('SIGTERM', stopAllRateLimiters);
 */
