import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentChatSessionsTable, agentChatMessagesTable } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/agent-chat/sessions - List all sessions for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const sessions = await db
      .select()
      .from(agentChatSessionsTable)
      .where(eq(agentChatSessionsTable.userId, session.user.id))
      .orderBy(desc(agentChatSessionsTable.updatedAt));

    return Response.json({ sessions });
  } catch (error) {
    logger.error({ error }, 'Error fetching sessions');
    return new Response('Internal server error', { status: 500 });
  }
}

// DELETE /api/agent-chat/sessions - Delete a session
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    // Delete messages first
    await db
      .delete(agentChatMessagesTable)
      .where(eq(agentChatMessagesTable.sessionId, sessionId));

    // Delete session
    await db
      .delete(agentChatSessionsTable)
      .where(eq(agentChatSessionsTable.id, sessionId));

    return Response.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting session');
    return new Response('Internal server error', { status: 500 });
  }
}
