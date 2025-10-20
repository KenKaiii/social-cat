import { Queue, Worker, QueueOptions, WorkerOptions, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from './logger';

/**
 * BullMQ Queue Setup with Redis
 *
 * Provides persistent job queue with automatic retries, backoff, and job history.
 * Replaces node-cron for production-ready job scheduling with recovery capabilities.
 *
 * Features:
 * - Persistent jobs (survives restarts)
 * - Automatic retries with exponential backoff
 * - Job history and status tracking
 * - Dead letter queue for failed jobs
 * - Rate limiting per queue
 * - Priority queues
 */

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,    // Recommended for BullMQ
  // Optional: Add password if Redis requires auth
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
};

// Alternative: Use REDIS_URL if provided (e.g., from Railway, Upstash)
const getRedisConnection = () => {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return new Redis(redisConfig);
};

// Default queue options with retry logic
const defaultQueueOptions: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,               // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',     // Exponential backoff (2^n * delay)
      delay: 5000,             // Initial delay: 5 seconds
    },
    removeOnComplete: {
      age: 86400,              // Keep completed jobs for 24 hours
      count: 1000,             // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 604800,             // Keep failed jobs for 7 days
      count: 5000,             // Keep max 5000 failed jobs
    },
  },
};

// Default worker options
const defaultWorkerOptions: Omit<WorkerOptions, 'connection'> = {
  autorun: false,              // Start workers manually
  concurrency: 1,              // Process one job at a time (safe for social media APIs)
  limiter: {
    max: 10,                   // Max 10 jobs
    duration: 60000,           // Per minute (rate limiting)
  },
};

/**
 * Queue Registry
 * Keep track of all queues and workers for cleanup
 */
export const queues = new Map<string, Queue>();
export const workers = new Map<string, Worker>();

/**
 * Create a new queue for job processing
 */
export function createQueue(
  name: string,
  options?: Partial<QueueOptions>
): Queue {
  if (queues.has(name)) {
    logger.warn({ queue: name }, 'Queue already exists, returning existing queue');
    return queues.get(name)!;
  }

  const queue = new Queue(name, {
    ...defaultQueueOptions,
    ...options,
  });

  queues.set(name, queue);
  logger.info({ queue: name }, 'Created queue');

  return queue;
}

/**
 * Create a worker to process jobs from a queue
 */
export function createWorker<T = unknown, R = unknown>(
  queueName: string,
  processor: (job: Job<T>) => Promise<R>,
  options?: Partial<WorkerOptions>
): Worker {
  if (workers.has(queueName)) {
    logger.warn({ queue: queueName }, 'Worker already exists for queue');
    return workers.get(queueName)!;
  }

  const worker = new Worker(
    queueName,
    async (job: Job<T>) => {
      logger.info(
        { jobId: job.id, jobName: job.name, attempt: job.attemptsMade + 1 },
        `Processing job: ${job.name}`
      );

      try {
        const result = await processor(job);
        logger.info(
          { jobId: job.id, jobName: job.name },
          `Completed job: ${job.name}`
        );
        return result;
      } catch (error) {
        logger.error(
          { jobId: job.id, jobName: job.name, error, attempt: job.attemptsMade + 1 },
          `Job failed: ${job.name}`
        );
        throw error;
      }
    },
    {
      connection: getRedisConnection(),
      ...defaultWorkerOptions,
      ...options,
    }
  );

  // Event listeners for worker lifecycle
  worker.on('completed', (job) => {
    logger.info(
      { jobId: job.id, jobName: job.name, duration: Date.now() - job.timestamp },
      'Job completed successfully'
    );
  });

  worker.on('failed', (job, error) => {
    if (job) {
      logger.error(
        { jobId: job.id, jobName: job.name, error, attempts: job.attemptsMade },
        'Job failed after retry attempts'
      );
    }
  });

  worker.on('error', (error) => {
    logger.error({ error }, 'Worker error');
  });

  workers.set(queueName, worker);
  logger.info({ queue: queueName }, 'Created worker');

  return worker;
}

/**
 * Helper: Add a job to a queue
 */
export async function addJob<T>(
  queueName: string,
  jobName: string,
  data: T,
  options?: {
    delay?: number;           // Delay in milliseconds before processing
    priority?: number;        // Lower number = higher priority
    repeat?: {               // Cron-style repeating jobs
      pattern?: string;      // Cron pattern (e.g., '0 */2 * * *')
      every?: number;        // Repeat every N milliseconds
    };
  }
) {
  const queue = queues.get(queueName);
  if (!queue) {
    throw new Error(`Queue "${queueName}" not found. Create it first with createQueue()`);
  }

  const job = await queue.add(jobName, data, options);
  logger.info(
    { queueName, jobId: job.id, jobName },
    'Added job to queue'
  );

  return job;
}

/**
 * Start all registered workers
 */
export async function startAllWorkers() {
  logger.info({ count: workers.size }, 'Starting all workers');

  for (const [name, worker] of workers.entries()) {
    await worker.run();
    logger.info({ worker: name }, 'Worker started');
  }

  logger.info('All workers started');
}

/**
 * Stop all queues and workers gracefully
 */
export async function shutdownQueues() {
  logger.info('Shutting down queues and workers');

  // Close all workers
  for (const [name, worker] of workers.entries()) {
    await worker.close();
    logger.info({ worker: name }, 'Worker closed');
  }

  // Close all queues
  for (const [name, queue] of queues.entries()) {
    await queue.close();
    logger.info({ queue: name }, 'Queue closed');
  }

  workers.clear();
  queues.clear();

  logger.info('All queues and workers shut down');
}

/**
 * Example queue names (export for use in job files)
 */
export const QUEUE_NAMES = {
  TWITTER_POST: 'twitter:post',
  TWITTER_REPLY: 'twitter:reply',
  YOUTUBE_COMMENT: 'youtube:comment',
  INSTAGRAM_POST: 'instagram:post',
  AI_GENERATION: 'ai:generation',
  ANALYTICS: 'analytics',
} as const;

/**
 * Example usage:
 *
 * // Create a queue
 * const twitterQueue = createQueue(QUEUE_NAMES.TWITTER_POST);
 *
 * // Create a worker to process jobs
 * createWorker(QUEUE_NAMES.TWITTER_POST, async (job) => {
 *   const { text } = job.data;
 *   await postTweet(text);
 * });
 *
 * // Add a job
 * await addJob(QUEUE_NAMES.TWITTER_POST, 'post-tweet', { text: 'Hello world' });
 *
 * // Start processing
 * await startAllWorkers();
 *
 * // Shutdown on exit
 * process.on('SIGTERM', shutdownQueues);
 */
