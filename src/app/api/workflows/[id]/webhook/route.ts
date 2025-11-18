import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workflowsTable } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { queueWorkflowExecution } from '@/lib/workflows/workflow-queue';
import { createHmac, timingSafeEqual } from 'crypto';
import { checkStrictRateLimit } from '@/lib/ratelimit';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/[id]/webhook
 * Trigger a workflow via webhook
 *
 * Only executes if:
 * 1. Workflow exists
 * 2. Workflow status is 'active'
 * 3. Workflow trigger type is 'webhook'
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting (3 requests per minute per IP/workflow)
    const rateLimitResult = await checkStrictRateLimit(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { id } = await context.params;

    // Get the workflow
    const workflows = await db
      .select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, id))
      .limit(1);

    if (workflows.length === 0) {
      logger.warn({ workflowId: id }, 'Webhook called for non-existent workflow');
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const workflow = workflows[0];

    // Check if workflow is active
    if (workflow.status !== 'active') {
      logger.warn(
        { workflowId: id, status: workflow.status },
        'Webhook called for inactive workflow'
      );
      return NextResponse.json(
        { error: 'Workflow is not active', status: workflow.status },
        { status: 403 }
      );
    }

    // Check if trigger type is webhook
    const trigger = workflow.trigger as { type: string; config: Record<string, unknown> };
    if (trigger.type !== 'webhook') {
      logger.warn(
        { workflowId: id, triggerType: trigger.type },
        'Webhook called for non-webhook trigger workflow'
      );
      return NextResponse.json(
        { error: 'Workflow trigger is not webhook', triggerType: trigger.type },
        { status: 400 }
      );
    }

    // Get raw body for signature verification
    const rawBody = await request.text();
    let body = {};
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch (parseError) {
        logger.error({ workflowId: id, parseError }, 'Failed to parse webhook body');
        return NextResponse.json(
          { error: 'Invalid JSON payload' },
          { status: 400 }
        );
      }
    }

    // Verify webhook signature if secret is configured
    const webhookSecret = trigger.config?.webhookSecret as string | undefined;
    if (webhookSecret) {
      const signature = request.headers.get('x-webhook-signature') || request.headers.get('x-hub-signature-256');

      if (!signature) {
        logger.warn({ workflowId: id }, 'Webhook signature missing but secret is configured');
        return NextResponse.json(
          { error: 'Webhook signature required' },
          { status: 401 }
        );
      }

      // Compute HMAC signature
      const hmac = createHmac('sha256', webhookSecret);
      hmac.update(rawBody);
      const expectedSignature = 'sha256=' + hmac.digest('hex');

      // Timing-safe comparison to prevent timing attacks
      try {
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
          logger.warn({ workflowId: id }, 'Invalid webhook signature');
          return NextResponse.json(
            { error: 'Invalid webhook signature' },
            { status: 401 }
          );
        }
      } catch (error) {
        logger.warn({ workflowId: id, error }, 'Failed to verify webhook signature');
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }

      logger.info({ workflowId: id }, 'Webhook signature verified');
    }
    const headers = Object.fromEntries(request.headers.entries());
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    // Queue workflow execution with webhook data
    await queueWorkflowExecution(
      id,
      workflow.userId,
      'webhook',
      {
        body,
        headers,
        query: queryParams,
        method: request.method,
        url: url.pathname,
      }
    );

    logger.info(
      {
        workflowId: id,
        userId: workflow.userId,
        hasBody: Object.keys(body).length > 0,
        hasQuery: Object.keys(queryParams).length > 0,
      },
      'Webhook workflow queued for execution'
    );

    return NextResponse.json({
      success: true,
      workflowId: id,
      workflowName: workflow.name,
      queued: true,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to process webhook');
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflows/[id]/webhook
 * Get webhook URL and status
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication for GET requests
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Get the workflow with ownership verification
    const workflows = await db
      .select({
        id: workflowsTable.id,
        name: workflowsTable.name,
        status: workflowsTable.status,
        trigger: workflowsTable.trigger,
      })
      .from(workflowsTable)
      .where(
        and(
          eq(workflowsTable.id, id),
          eq(workflowsTable.userId, session.user.id)
        )
      )
      .limit(1);

    if (workflows.length === 0) {
      return NextResponse.json(
        { error: 'Workflow not found or access denied' },
        { status: 404 }
      );
    }

    const workflow = workflows[0];
    const trigger = workflow.trigger as { type: string; config: Record<string, unknown> };

    if (trigger.type !== 'webhook') {
      return NextResponse.json(
        { error: 'Workflow trigger is not webhook' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`;
    const webhookUrl = `${baseUrl}/api/workflows/${id}/webhook`;

    return NextResponse.json({
      workflowId: id,
      workflowName: workflow.name,
      webhookUrl,
      status: workflow.status,
      active: workflow.status === 'active',
      triggerType: trigger.type,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get webhook info');
    return NextResponse.json(
      { error: 'Failed to get webhook info' },
      { status: 500 }
    );
  }
}
