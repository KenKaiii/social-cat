import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { scheduler } from '@/lib/scheduler';
import { db } from '@/lib/db';
import { appSettingsTable } from '@/lib/schema';
import {
  generateAndPostTweet,
  analyzeTrends,
  generateScheduledContent,
} from '@/lib/jobs/twitter-ai';
import { replyToTweetsJob } from '@/lib/jobs/twitter-reply';
import { postTweetsJob } from '@/lib/jobs/twitter-post';
import {
  checkAndReplyToYouTubeComments,
  fetchYouTubeCommentsForAnalysis,
} from '@/lib/jobs/youtube';
import { wordpressAutoBlogJob } from '@/lib/jobs/wordpress-auto-blog';

/**
 * API Route: Control individual jobs (start/stop)
 *
 * POST /api/jobs/control
 * Body: { action: 'start' | 'stop', jobName: string, interval?: string }
 *
 * This endpoint allows dynamic starting/stopping of scheduled jobs
 * based on UI toggle switches. It respects database settings for
 * enabled state and cron schedule.
 */

// Map job names to their task functions
const JOB_TASKS: Record<string, () => void | Promise<void>> = {
  'ai-tweet-generation': generateAndPostTweet,
  'reply-to-tweets': replyToTweetsJob,
  'post-tweets': postTweetsJob,
  'generate-scheduled-content': generateScheduledContent,
  'analyze-trends': analyzeTrends,
  'check-youtube-comments': checkAndReplyToYouTubeComments,
  'fetch-youtube-comments-analysis': fetchYouTubeCommentsForAnalysis,
  'wordpress-auto-blog': wordpressAutoBlogJob,
};

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, jobName, interval } = body;

    if (!action || !jobName) {
      return NextResponse.json(
        { error: 'Missing required fields: action and jobName' },
        { status: 400 }
      );
    }

    if (!['start', 'stop'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "start" or "stop"' },
        { status: 400 }
      );
    }

    if (!JOB_TASKS[jobName]) {
      return NextResponse.json({ error: `Unknown job: ${jobName}` }, { status: 404 });
    }

    // Get the task function
    const task = JOB_TASKS[jobName];

    if (action === 'start') {
      // Load interval from database or use provided value
      let schedule = interval;

      if (!schedule) {
        // Load from database
        const prefix = `${jobName}_`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settingRow = await (db as any)
          .select()
          .from(appSettingsTable)
          .where(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (appSettingsTable as any).key,
            '=',
            `${prefix}interval`
          )
          .limit(1) as Array<{ value: string }>;

        if (settingRow.length > 0) {
          try {
            schedule = JSON.parse(settingRow[0].value);
          } catch {
            schedule = settingRow[0].value;
          }
        }
      }

      if (!schedule) {
        return NextResponse.json(
          { error: 'No schedule found. Please configure the schedule first.' },
          { status: 400 }
        );
      }

      // Register or update the job with the new schedule
      scheduler.registerOrUpdate({
        name: jobName,
        schedule,
        task,
        enabled: true,
      });

      return NextResponse.json({
        message: `Job "${jobName}" started with schedule: ${schedule}`,
        jobName,
        schedule,
      });
    } else {
      // Stop the job
      const success = scheduler.stopJob(jobName);

      // Always return success even if job wasn't running
      // This is more user-friendly and idempotent
      return NextResponse.json({
        message: success
          ? `Job "${jobName}" stopped`
          : `Job "${jobName}" was not running (already stopped)`,
        jobName,
        wasRunning: success,
      });
    }
  } catch (error) {
    console.error('Error controlling job:', error);
    return NextResponse.json(
      { error: 'Failed to control job', details: String(error) },
      { status: 500 }
    );
  }
}
