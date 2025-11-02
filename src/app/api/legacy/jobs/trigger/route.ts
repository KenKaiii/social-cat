import { NextRequest, NextResponse } from 'next/server';
import {
  exampleEvery5Minutes,
  exampleHourly,
  exampleDaily,
  generateAndPostTweet,
  analyzeTrends,
  generateScheduledContent,
  replyToTweetsJob,
  postTweetsJob,
  checkAndReplyToYouTubeComments,
  fetchYouTubeCommentsForAnalysis,
  wordpressAutoBlogJob,
} from '@/lib/jobs';
import { replyToYouTubeCommentsJob } from '@/lib/jobs/youtube-reply';
import { checkStrictRateLimit } from '@/lib/ratelimit';
import { logger, logApiRequest, logApiError } from '@/lib/logger';
import { triggerJobSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { jobLogsTable } from '@/lib/schema';

/**
 * API Route to manually trigger scheduled jobs
 *
 * Usage:
 * POST /api/jobs/trigger?job=example-every-5-minutes
 *
 * Available jobs:
 * - example-every-5-minutes
 * - example-hourly
 * - example-daily
 * - generate-scheduled-content
 * - analyze-trends
 * - ai-tweet-generation
 * - reply-to-tweets
 * - post-tweets
 * - check-youtube-comments
 * - reply-to-youtube-comments
 * - fetch-youtube-comments-analysis
 */

const availableJobs: Record<string, (params?: unknown) => Promise<void>> = {
  'example-every-5-minutes': exampleEvery5Minutes as (params?: unknown) => Promise<void>,
  'example-hourly': exampleHourly as (params?: unknown) => Promise<void>,
  'example-daily': exampleDaily as (params?: unknown) => Promise<void>,
  'generate-scheduled-content': generateScheduledContent as (params?: unknown) => Promise<void>,
  'analyze-trends': analyzeTrends as (params?: unknown) => Promise<void>,
  'ai-tweet-generation': generateAndPostTweet as (params?: unknown) => Promise<void>,
  'reply-to-tweets': replyToTweetsJob as (params?: unknown) => Promise<void>,
  'post-tweets': postTweetsJob as (params?: unknown) => Promise<void>,
  'check-youtube-comments': checkAndReplyToYouTubeComments as (params?: unknown) => Promise<void>,
  'reply-to-youtube-comments': replyToYouTubeCommentsJob as (params?: unknown) => Promise<void>,
  'fetch-youtube-comments-analysis': fetchYouTubeCommentsForAnalysis as (params?: unknown) => Promise<void>,
  'wordpress-auto-blog': wordpressAutoBlogJob as (params?: unknown) => Promise<void>,
};

export async function POST(request: NextRequest) {
  // Apply strict rate limiting (3 requests per minute)
  const rateLimitResult = await checkStrictRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const jobName = searchParams.get('job');

    // Read optional body params (for jobs that need configuration)
    let bodyParams = {};
    try {
      const body = await request.text();
      if (body) {
        bodyParams = JSON.parse(body);
      }
    } catch {
      // Body parsing failed or empty, continue with empty params
    }

    // Validate input with Zod
    const validation = triggerJobSchema.safeParse({ job: jobName });

    if (!validation.success) {
      logApiRequest('POST', '/api/jobs/trigger', 400);
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.error.issues,
          availableJobs: Object.keys(availableJobs),
        },
        { status: 400 }
      );
    }

    const validatedJobName = validation.data.job;
    const jobFunction = availableJobs[validatedJobName];

    if (!jobFunction) {
      logApiRequest('POST', '/api/jobs/trigger', 404);
      return NextResponse.json(
        {
          error: `Job "${validatedJobName}" not found`,
          availableJobs: Object.keys(availableJobs),
        },
        { status: 404 }
      );
    }

    logger.info({ job: validatedJobName, params: bodyParams }, `Manually triggering job: ${validatedJobName}`);

    const startTime = Date.now();
    let jobStatus: 'success' | 'error' = 'success';
    let jobMessage = 'Job executed successfully';
    let jobError: string | undefined;

    try {
      await jobFunction(bodyParams);
    } catch (jobError_) {
      jobStatus = 'error';
      jobMessage = 'Job execution failed';
      jobError = jobError_ instanceof Error ? jobError_.message : 'Unknown error';
      throw jobError_; // Re-throw to be caught by outer catch
    } finally {
      const duration = Date.now() - startTime;

      // Write to job_logs table for activity page
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).insert(jobLogsTable).values({
          jobName: validatedJobName,
          status: jobStatus,
          message: jobMessage,
          details: JSON.stringify({
            params: bodyParams,
            error: jobError,
            triggeredManually: true,
          }),
          duration,
        });
      } catch (dbError) {
        logger.error({ dbError }, 'Failed to write job log to database');
      }
    }

    logApiRequest('POST', '/api/jobs/trigger', 200);

    return NextResponse.json({
      success: true,
      message: `Job "${validatedJobName}" executed successfully`,
      job: validatedJobName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logApiError('POST', '/api/jobs/trigger', error);

    return NextResponse.json(
      {
        error: 'Failed to execute job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to trigger a job',
    availableJobs: Object.keys(availableJobs),
    usage: 'POST /api/jobs/trigger?job=<job-name>',
  });
}
