import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { workflowRunsTable } from '@/lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/logs
 * List workflow execution logs (runs) for the authenticated user
 * Query params:
 *   - organizationId: Filter by organization/client
 *   - limit: Number of logs to return (default: 50, max: 1000)
 *   - workflowId: Filter by specific workflow
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const workflowId = searchParams.get('workflowId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 1000) : 50;

    // Build where clause
    const whereConditions = [eq(workflowRunsTable.userId, session.user.id)];

    if (organizationId) {
      whereConditions.push(eq(workflowRunsTable.organizationId, organizationId));
    }

    if (workflowId) {
      whereConditions.push(eq(workflowRunsTable.workflowId, workflowId));
    }

    // Fetch workflow runs (logs)
    const logs = await db
      .select({
        id: workflowRunsTable.id,
        workflowId: workflowRunsTable.workflowId,
        status: workflowRunsTable.status,
        triggerType: workflowRunsTable.triggerType,
        triggerData: workflowRunsTable.triggerData,
        startedAt: workflowRunsTable.startedAt,
        completedAt: workflowRunsTable.completedAt,
        duration: workflowRunsTable.duration,
        output: workflowRunsTable.output,
        error: workflowRunsTable.error,
        errorStep: workflowRunsTable.errorStep,
      })
      .from(workflowRunsTable)
      .where(and(...whereConditions))
      .orderBy(desc(workflowRunsTable.startedAt))
      .limit(limit);

    logger.info(
      {
        userId: session.user.id,
        organizationId,
        logCount: logs.length,
        action: 'logs_fetch_success',
      },
      'Workflow logs fetched successfully'
    );

    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        action: 'logs_fetch_failed',
      },
      'Failed to fetch workflow logs'
    );
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
