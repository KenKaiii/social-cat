import { createQueue, createWorker, addJob, QUEUE_NAMES } from '../queue';
import { replyToTweetsWorkflow } from '../workflows/twitter/reply-to-tweets';
import { logger } from '../logger';

/**
 * Twitter Reply Job (BullMQ Version)
 *
 * Production-ready job queue implementation with:
 * - Job persistence (survives restarts)
 * - Automatic retries (3 attempts with exponential backoff)
 * - Job history (24h completed, 7d failed)
 * - Manual triggering and replay capability
 * - Rate limiting at queue level (1 job per 2 hours)
 *
 * The workflow itself has additional reliability:
 * - Automatic API retries (RapidAPI: 4, Twitter/OpenAI: 3)
 * - Circuit breakers on all external APIs
 * - Rate limiting (Twitter: 50 actions/hour, OpenAI: 500 req/min)
 * - Structured logging to logs/app.log
 *
 * Migration Notes:
 * - This is a drop-in replacement for the node-cron version
 * - Both can run simultaneously during migration
 * - Disable node-cron job in src/lib/jobs/index.ts after testing
 *
 * Usage:
 * ```typescript
 * // Initialize on app startup
 * await setupTwitterReplyJob();
 * await startAllWorkers();
 *
 * // Manual trigger (optional)
 * await addJob(QUEUE_NAMES.TWITTER_REPLY, 'manual-trigger', {
 *   query: 'your search query'
 * });
 * ```
 */

interface JobData {
  query: string;
  systemPrompt?: string;
  dryRun?: boolean;
}

/**
 * Setup Twitter Reply Job Queue
 * Call this once during application initialization
 */
export async function setupTwitterReplyJob() {
  logger.info('Setting up Twitter Reply job queue (BullMQ)');

  // Create queue (unused but needed for initialization)
  createQueue(QUEUE_NAMES.TWITTER_REPLY, {
    defaultJobOptions: {
      attempts: 3,              // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 5000,            // Start with 5 second delay
      },
      removeOnComplete: {
        age: 86400,             // Keep completed jobs for 24 hours
        count: 100,
      },
      removeOnFail: {
        age: 604800,            // Keep failed jobs for 7 days
        count: 500,
      },
    },
  });

  // Create worker to process jobs
  createWorker<JobData>(
    QUEUE_NAMES.TWITTER_REPLY,
    async (job) => {
      const { query, systemPrompt, dryRun } = job.data;

      logger.info(
        {
          jobId: job.id,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
          query,
          dryRun: dryRun || false,
        },
        '🚀 Starting Twitter Reply workflow'
      );

      try {
        // Execute the workflow with all reliability features
        const result = await replyToTweetsWorkflow({
          searchQuery: query,
          systemPrompt,
          dryRun: dryRun || false,
        });

        logger.info(
          {
            jobId: job.id,
            tweetId: result.selectedTweet?.tweet_id,
            replyId: (result.replyResult as { id?: string })?.id,
            username: result.selectedTweet?.user_screen_name,
          },
          '✅ Twitter Reply workflow completed successfully'
        );

        return result; // Save result in job for inspection
      } catch (error) {
        logger.error(
          {
            jobId: job.id,
            attempt: job.attemptsMade + 1,
            error,
            query,
          },
          '❌ Twitter Reply workflow failed'
        );

        throw error; // Will trigger automatic retry
      }
    },
    {
      concurrency: 1,           // Process one at a time
      limiter: {
        max: 1,                 // Max 1 job
        duration: 2 * 60 * 60 * 1000, // Per 2 hours
      },
    }
  );

  // Add repeating job (cron-style scheduling)
  const searchQuery = process.env.TWITTER_REPLY_SEARCH_QUERY;
  const systemPrompt = process.env.TWITTER_REPLY_SYSTEM_PROMPT;

  if (!searchQuery) {
    logger.warn('⚠️  TWITTER_REPLY_SEARCH_QUERY not set - Twitter Reply job not scheduled');
    logger.warn('   Set this environment variable to enable automatic tweet replies');
    return;
  }

  await addJob(
    QUEUE_NAMES.TWITTER_REPLY,
    'reply-to-tweets',
    {
      query: searchQuery,
      systemPrompt,
      dryRun: false, // Set to true to test without posting
    },
    {
      repeat: {
        pattern: '0 */2 * * *', // Every 2 hours (at minute 0)
        // Alternatively, use 'every' for interval-based:
        // every: 2 * 60 * 60 * 1000, // Every 2 hours in ms
      },
      priority: 1,              // High priority (1-10, lower = higher priority)
    }
  );

  logger.info(
    { query: searchQuery, schedule: '0 */2 * * *' },
    '✅ Twitter Reply job scheduled successfully'
  );
}

/**
 * Manually trigger a Twitter reply job (for testing)
 *
 * Usage:
 * ```typescript
 * // Test with dry-run
 * await triggerTwitterReplyJob('AI', true);
 *
 * // Real post
 * await triggerTwitterReplyJob('nextjs');
 * ```
 */
export async function triggerTwitterReplyJob(
  query: string,
  dryRun: boolean = false,
  systemPrompt?: string
) {
  logger.info({ query, dryRun }, 'Manually triggering Twitter Reply job');

  const job = await addJob<JobData>(
    QUEUE_NAMES.TWITTER_REPLY,
    'manual-trigger',
    {
      query,
      systemPrompt,
      dryRun,
    }
  );

  logger.info({ jobId: job.id }, 'Job added to queue');

  return job;
}

/**
 * Example: How to initialize in your app
 *
 * ```typescript
 * // src/app/api/scheduler/route.ts
 * import { setupTwitterReplyJob } from '@/lib/jobs/twitter-reply-bullmq';
 * import { startAllWorkers } from '@/lib/queue';
 *
 * export async function POST() {
 *   await setupTwitterReplyJob();
 *   await startAllWorkers();
 *
 *   return Response.json({
 *     success: true,
 *     message: 'Twitter Reply job initialized with BullMQ'
 *   });
 * }
 * ```
 *
 * Example: Viewing job status with Bull Board
 *
 * Visit: http://localhost:3000/api/admin/queues
 * - See all queued/running/completed/failed jobs
 * - Retry failed jobs manually
 * - View job data and error details
 *
 * Example: Migrating from node-cron
 *
 * 1. Keep both systems running initially:
 *    - Disable the node-cron job in src/lib/jobs/index.ts (set enabled: false)
 *    - Initialize BullMQ version
 *    - Test thoroughly with dryRun: true
 *
 * 2. After testing, remove node-cron job:
 *    - Delete or comment out the job in src/lib/jobs/index.ts
 *    - Update scheduler initialization to only use BullMQ
 *
 * Benefits over node-cron:
 * ✅ Jobs survive server restarts
 * ✅ Automatic retries on failure
 * ✅ Job history for debugging
 * ✅ Manual replay capability
 * ✅ Web UI for job management (Bull Board)
 * ✅ Distributed job processing (with Redis)
 * ✅ Rate limiting at queue level
 * ✅ Priority queues
 */
