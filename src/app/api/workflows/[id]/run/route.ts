import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { queueWorkflowExecution, isWorkflowQueueAvailable } from '@/lib/workflows/workflow-queue';
import { executeWorkflow } from '@/lib/workflows/executor';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/[id]/run
 * Execute a workflow manually
 *
 * Uses queue system if Redis is configured, otherwise executes directly.
 * Queue system provides:
 * - Controlled concurrency (prevents resource exhaustion)
 * - Automatic retries on failure
 * - Job prioritization
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    // Optional: Accept trigger data and priority from request body
    const body = await request.json().catch(() => ({}));
    const triggerData = body.triggerData || {};
    const priority = body.priority as number | undefined;

    // Use queue if available, otherwise execute directly
    if (isWorkflowQueueAvailable()) {
      const { jobId, queued } = await queueWorkflowExecution(
        id,
        session.user.id,
        'manual',
        triggerData,
        { priority }
      );

      return NextResponse.json({
        success: true,
        queued,
        jobId,
        message: 'Workflow queued for execution',
      });
    }

    // Fallback: Direct execution (no Redis)
    const result = await executeWorkflow(
      id,
      session.user.id,
      'manual',
      triggerData
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorStep: result.errorStep,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      output: result.output,
      queued: false,
    });
  } catch (error) {
    console.error('Failed to execute workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
