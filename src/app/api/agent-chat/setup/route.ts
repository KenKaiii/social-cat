import { auth } from '@/lib/auth';
import { getAgentWorkspaceDir, initializeAgentWorkspace } from '@/lib/agent-workspace';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/agent-chat/setup - Check if workspace is set up
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    initializeAgentWorkspace();
    const workspaceDir = getAgentWorkspaceDir();
    const isInstalled = existsSync(join(workspaceDir, 'node_modules'));

    return Response.json({
      isInstalled,
      workspaceDir: getAgentWorkspaceDir(),
    });
  } catch (error) {
    logger.error({ error }, 'Error checking setup');
    return new Response('Internal server error', { status: 500 });
  }
}

// POST /api/agent-chat/setup - Install dependencies
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const workspaceDir = getAgentWorkspaceDir();

    // Create SSE stream for installation progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Installing dependencies...' })}\n\n`)
          );

          // Run npm install
          const npmProcess = spawn('npm', ['install'], {
            cwd: workspaceDir,
            stdio: 'pipe',
          });

          npmProcess.stdout.on('data', (data: Buffer) => {
            const output = data.toString();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'output', message: output })}\n\n`)
            );
          });

          npmProcess.stderr.on('data', (data: Buffer) => {
            const output = data.toString();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'output', message: output })}\n\n`)
            );
          });

          npmProcess.on('close', (code) => {
            if (code === 0) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'complete', success: true })}\n\n`)
              );
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'complete', success: false, error: `npm install exited with code ${code}` })}\n\n`)
              );
            }
            controller.close();
          });
        } catch (error) {
          logger.error({ error }, 'Installation error');
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Setup request error');
    return new Response('Internal server error', { status: 500 });
  }
}
