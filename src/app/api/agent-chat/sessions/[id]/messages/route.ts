import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentChatMessagesTable } from '@/lib/schema';
import { eq, asc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/agent-chat/sessions/[id]/messages - Get messages for a session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const messages = await db
      .select()
      .from(agentChatMessagesTable)
      .where(eq(agentChatMessagesTable.sessionId, id))
      .orderBy(asc(agentChatMessagesTable.createdAt));

    return Response.json({ messages });
  } catch (error) {
    logger.error({ error }, 'Error fetching messages');
    return new Response('Internal server error', { status: 500 });
  }
}
