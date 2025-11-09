import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOrganizationMembers, getUserRoleInOrganization } from '@/lib/organizations';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { accountsTable, invitationsTable } from '@/lib/schema';
import { inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * GET /api/clients/[id]/members
 * Get all members of a client organization
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify user has access to this organization
    const role = await getUserRoleInOrganization(session.user.id, id);
    if (!role) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all members with account details in a single query (fixes N+1 problem)
    const members = await getOrganizationMembers(id);

    // Fetch all account details in one query
    const userIds = members.map(m => m.userId);
    const accounts = userIds.length > 0
      ? await db
          .select()
          .from(accountsTable)
          .where(inArray(accountsTable.userId, userIds))
      : [];

    // Create lookup map for O(1) access
    const accountMap = new Map(
      accounts.map(acc => [acc.userId, acc])
    );

    // Map members with their account details
    const membersWithDetails = members.map((member) => {
      const account = accountMap.get(member.userId);
      return {
        id: member.id,
        userId: member.userId,
        email: account?.account_name || member.userId,
        name: account?.account_name,
        role: member.role,
        joinedAt: member.joinedAt,
      };
    });

    return NextResponse.json({ members: membersWithDetails });
  } catch (error) {
    const { id } = await params;
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        organizationId: id,
        action: 'client_members_fetch_failed'
      },
      'Failed to fetch client members'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/clients/[id]/members
 * Invite a new member to the client organization
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Verify user has permission (must be owner or admin)
    const userRole = await getUserRoleInOrganization(session.user.id, id);
    if (userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 });
    }

    // Generate invitation token
    const token = nanoid(32);
    const invitationId = nanoid();

    // Create invitation that expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).insert(invitationsTable).values({
      id: invitationId,
      token,
      email: email.toLowerCase(),
      organizationId: id,
      role,
      invitedBy: session.user.id,
      expiresAt,
      createdAt: new Date(),
    });

    // Generate invitation link
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/register?token=${token}&email=${encodeURIComponent(email)}`;

    // TODO: Send email with invitation link

    return NextResponse.json({
      success: true,
      message: 'Invitation created successfully',
      inviteUrl, // Include URL in response for development
    });
  } catch (error) {
    const { id } = await params;
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        organizationId: id,
        action: 'client_member_invite_failed'
      },
      'Failed to invite client member'
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
