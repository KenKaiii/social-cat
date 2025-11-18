import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentChatSessionsTable, agentChatMessagesTable } from '@/lib/schema';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getAgentWorkspaceDir, initializeAgentWorkspace } from '@/lib/agent-workspace';
import { expandSlashCommand } from '@/lib/slash-command-expander';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-Sent Events endpoint for agent chat with streaming
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { message, sessionId: existingSessionId, model = 'sonnet' } = body;

    if (!message || typeof message !== 'string') {
      return new Response('Message is required', { status: 400 });
    }

    // Get or create session
    let sessionId = existingSessionId;
    if (!sessionId) {
      sessionId = nanoid();
      await db.insert(agentChatSessionsTable).values({
        id: sessionId,
        userId: session.user.id,
        organizationId: session.user.organizationId || null,
        title: message.substring(0, 100),
        model,
        messageCount: 0,
      });
    }

    // Save user message to database
    const userMessageId = nanoid();
    await db.insert(agentChatMessagesTable).values({
      id: userMessageId,
      sessionId,
      role: 'user',
      content: message,
      metadata: null,
    });

    // Update message count
    const sessionData = await db
      .select()
      .from(agentChatSessionsTable)
      .where(eq(agentChatSessionsTable.id, sessionId))
      .limit(1);

    if (sessionData[0]) {
      await db
        .update(agentChatSessionsTable)
        .set({
          messageCount: (sessionData[0].messageCount || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(agentChatSessionsTable.id, sessionId));
    }

    // Map model to API model ID
    const modelMap: Record<string, string> = {
      sonnet: 'claude-sonnet-4-5-20250929',
      haiku: 'claude-haiku-4-5-20251001',
    };

    const apiModelId = modelMap[model] || modelMap.sonnet;

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send session ID first
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`)
          );

          const contentBlocks: unknown[] = [];

          // Initialize agent workspace (creates ~/Documents/b0t and copies necessary folders)
          initializeAgentWorkspace();
          const workingDir = getAgentWorkspaceDir();

          // Load custom system prompt if it exists
          const fs = await import('fs');
          const path = await import('path');
          const customPromptPath = path.join(process.cwd(), '.claude/prompts/build-agent.txt');
          let systemPrompt = '';

          if (fs.existsSync(customPromptPath)) {
            systemPrompt = fs.readFileSync(customPromptPath, 'utf-8');
          }

          // Handle /clear command - clear context but keep visual history
          if (message.trim() === '/clear') {
            logger.info('🧹 /clear command - clearing SDK session');

            // Clear SDK session ID to force fresh start
            if (sessionData[0]) {
              await db
                .update(agentChatSessionsTable)
                .set({ sdkSessionId: null })
                .where(eq(agentChatSessionsTable.id, sessionId));
            }

            // Save user message
            await db.insert(agentChatMessagesTable).values({
              id: nanoid(),
              sessionId,
              role: 'user',
              content: '/clear',
              metadata: null,
            });

            // Send cleared message
            const clearMessage = [{ type: 'text', text: '--- Context cleared. The AI will not remember previous messages ---' }];
            await db.insert(agentChatMessagesTable).values({
              id: nanoid(),
              sessionId,
              role: 'assistant',
              content: JSON.stringify(clearMessage),
              metadata: null,
            });

            // Send to client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'content_block', block: clearMessage[0] })}\n\n`)
            );
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
            );
            controller.close();
            return;
          }

          // Expand slash command if detected
          let promptText = message;
          if (message.trim().startsWith('/')) {
            const expanded = expandSlashCommand(message.trim(), workingDir);
            if (expanded) {
              promptText = expanded;
            }
          }

          // Check if we have SDK session ID for resume (multi-turn conversation)
          const isFirstMessage = (sessionData[0]?.messageCount || 0) === 1;
          const sdkSessionId = sessionData[0]?.sdkSessionId;

          // Create Query instance with Claude Agent SDK
          const q = query({
            prompt: promptText,
            options: {
              model: apiModelId,
              permissionMode: 'bypassPermissions',
              cwd: workingDir,
              settingSources: ['local', 'project'],
              // Add custom system prompt
              ...(systemPrompt ? { systemPrompt } : {}),
              // Use resume for continuing conversations
              ...(isFirstMessage || !sdkSessionId ? {} : { resume: sdkSessionId }),
            },
          });

          let capturedSdkSessionId: string | null = null;

          // Iterate through messages from the subprocess
          for await (const msg of q) {
            // Capture SDK session ID from system messages
            if (msg.type === 'system' && 'session_id' in msg && typeof msg.session_id === 'string') {
              capturedSdkSessionId = msg.session_id;
              logger.info(`📋 Captured SDK session ID: ${capturedSdkSessionId}`);
            }

            // Stream all message types including partial messages
            if (msg.type === 'assistant') {
              // Send entire message content blocks
              for (const block of msg.message.content) {
                // Only send new blocks (not already in contentBlocks)
                const blockExists = contentBlocks.some(
                  (b: unknown) =>
                    typeof b === 'object' &&
                    b !== null &&
                    'type' in b &&
                    b.type === 'tool_use' &&
                    'id' in b &&
                    block.type === 'tool_use' &&
                    'id' in block &&
                    b.id === block.id
                );

                if (!blockExists) {
                  contentBlocks.push(block);

                  // Stream the block to client immediately
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'content_block', block })}\n\n`)
                  );
                }
              }
            }
          }

          // Store SDK session ID for future resume
          if (capturedSdkSessionId && sessionData[0]) {
            await db
              .update(agentChatSessionsTable)
              .set({ sdkSessionId: capturedSdkSessionId })
              .where(eq(agentChatSessionsTable.id, sessionId));
          }

          // Save assistant response to database (store as JSON array of blocks)
          const assistantMessageId = nanoid();
          await db.insert(agentChatMessagesTable).values({
            id: assistantMessageId,
            sessionId,
            role: 'assistant',
            content: JSON.stringify(contentBlocks),
            metadata: null,
          });

          // Update message count again for assistant message
          await db
            .update(agentChatSessionsTable)
            .set({
              messageCount: (sessionData[0]?.messageCount || 0) + 2,
              updatedAt: new Date(),
            })
            .where(eq(agentChatSessionsTable.id, sessionId));

          // Send completion event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          );

          controller.close();
        } catch (error) {
          logger.error({ error }, 'Agent chat error');
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
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
    logger.error({ error }, 'Agent chat request error');
    return new Response('Internal server error', { status: 500 });
  }
}
