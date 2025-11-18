import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { executeWorkflowWithProgress } from '@/lib/workflows/executor-stream';
import { db } from '@/lib/db';
import { workflowsTable } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Zod schema for trigger data validation
const triggerDataSchema = z.record(z.string(), z.unknown());

/**
 * Helper to create SSE stream with workflow execution
 */
async function createWorkflowStream(
  workflowId: string,
  userId: string,
  triggerType: string,
  triggerData?: Record<string, unknown>
) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      // Helper to send SSE events
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Execute workflow with progress callback
        await executeWorkflowWithProgress(
          workflowId,
          userId,
          triggerType,
          triggerData,
          (event) => {
            // Stream each progress event to the client
            sendEvent(event.type, event);
          }
        );

        // Close stream when done
        controller.close();
      } catch (error) {
        // Send error event
        sendEvent('error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.close();
      }
    },
  });
}

/**
 * GET /api/workflows/[id]/stream
 * Execute a workflow with real-time progress streaming via SSE
 *
 * Query params:
 * - triggerType: The type of trigger (manual, chat, chat-input, etc.)
 * - triggerData: JSON-encoded trigger data for triggers like chat-input
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { id } = await context.params;

  try {
    // Verify workflow ownership
    const workflows = await db
      .select()
      .from(workflowsTable)
      .where(
        and(
          eq(workflowsTable.id, id),
          eq(workflowsTable.userId, session.user.id)
        )
      )
      .limit(1);

    if (workflows.length === 0) {
      return new Response(JSON.stringify({ error: 'Workflow not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse trigger type and data from query params with validation
    const { searchParams } = new URL(request.url);
    const triggerType = searchParams.get('triggerType') || 'manual';
    const triggerDataParam = searchParams.get('triggerData');

    let triggerData: Record<string, unknown> | undefined;
    if (triggerDataParam) {
      try {
        const parsed = JSON.parse(triggerDataParam);
        triggerData = triggerDataSchema.parse(parsed);
      } catch (error) {
        const details = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({
          error: 'Invalid trigger data format',
          details
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const stream = await createWorkflowStream(id, session.user.id, triggerType, triggerData);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to execute workflow' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
