import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getWorkflowQueueStats, isWorkflowQueueAvailable } from '@/lib/workflows/workflow-queue';
import { workflowScheduler } from '@/lib/workflows/workflow-scheduler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/queue/stats
 * Get workflow queue and scheduler statistics
 *
 * Useful for monitoring system health and capacity
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const queueAvailable = isWorkflowQueueAvailable();
    const queueStats = queueAvailable ? await getWorkflowQueueStats() : null;
    const schedulerStatus = workflowScheduler.getStatus();

    return NextResponse.json({
      queue: {
        available: queueAvailable,
        redis: !!process.env.REDIS_URL,
        stats: queueStats,
      },
      scheduler: schedulerStatus,
      capacity: {
        message: queueAvailable
          ? `Running up to 10 workflows concurrently. ${queueStats?.active || 0} active, ${queueStats?.waiting || 0} queued.`
          : 'Direct execution mode (no queue) - limited concurrent capacity',
        recommendation: queueAvailable
          ? null
          : 'Set REDIS_URL to enable queued execution with better concurrency control',
      },
    });
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
