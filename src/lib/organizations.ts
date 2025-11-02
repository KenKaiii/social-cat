import { db } from './db';
import { organizationsTableSQLite, organizationMembersTableSQLite, type Organization, type OrganizationMember } from './schema';
import { eq, and } from 'drizzle-orm';
import slugify from 'slugify';
import { randomUUID } from 'crypto';

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Create a new organization
 */
export async function createOrganization(
  name: string,
  ownerId: string,
  plan: 'free' | 'pro' | 'enterprise' = 'free'
): Promise<Organization> {
  const id = randomUUID();

  // Generate unique slug
  let slug = slugify(name, { lower: true, strict: true });

  // Check if slug exists, append number if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any)
    .select()
    .from(organizationsTableSQLite)
    .where(eq(organizationsTableSQLite.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  // Create organization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(organizationsTableSQLite).values({
    id,
    name,
    slug,
    ownerId,
    plan,
    settings: {},
  });

  // Add owner as member
  await (db as any).insert(organizationMembersTableSQLite).values({
    id: randomUUID(),
    organizationId: id,
    userId: ownerId,
    role: 'owner',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [org] = await (db as any)
    .select()
    .from(organizationsTableSQLite)
    .where(eq(organizationsTableSQLite.id, id))
    .limit(1);

  return org as Organization;
}

/**
 * Get all organizations a user belongs to
 */
export async function getUserOrganizations(userId: string): Promise<Array<Organization & { role: OrganizationRole }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = await (db as any)
    .select({
      organization: organizationsTableSQLite,
      role: organizationMembersTableSQLite.role,
    })
    .from(organizationMembersTableSQLite)
    .innerJoin(
      organizationsTableSQLite,
      eq(organizationMembersTableSQLite.organizationId, organizationsTableSQLite.id)
    )
    .where(eq(organizationMembersTableSQLite.userId, userId));

  return memberships.map((m: any) => ({
    ...m.organization,
    role: m.role as OrganizationRole,
  }));
}

/**
 * Get a specific organization by ID
 */
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [org] = await (db as any)
    .select()
    .from(organizationsTableSQLite)
    .where(eq(organizationsTableSQLite.id, orgId))
    .limit(1);

  return org || null;
}

/**
 * Get user's role in an organization
 */
export async function getUserRoleInOrganization(
  userId: string,
  organizationId: string
): Promise<OrganizationRole | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [membership] = await (db as any)
    .select()
    .from(organizationMembersTableSQLite)
    .where(
      and(
        eq(organizationMembersTableSQLite.userId, userId),
        eq(organizationMembersTableSQLite.organizationId, organizationId)
      )
    )
    .limit(1);

  return membership?.role as OrganizationRole || null;
}

/**
 * Check if user has access to an organization
 */
export async function userHasAccessToOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const role = await getUserRoleInOrganization(userId, organizationId);
  return role !== null;
}

/**
 * Get all members of an organization
 */
export async function getOrganizationMembers(organizationId: string): Promise<Array<OrganizationMember>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const members = await (db as any)
    .select()
    .from(organizationMembersTableSQLite)
    .where(eq(organizationMembersTableSQLite.organizationId, organizationId));

  return members;
}

/**
 * Add a member to an organization
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: OrganizationRole = 'member'
): Promise<OrganizationMember> {
  const id = randomUUID();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(organizationMembersTableSQLite).values({
    id,
    organizationId,
    userId,
    role,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [member] = await (db as any)
    .select()
    .from(organizationMembersTableSQLite)
    .where(eq(organizationMembersTableSQLite.id, id))
    .limit(1);

  return member as OrganizationMember;
}

/**
 * Remove a member from an organization
 */
export async function removeOrganizationMember(
  organizationId: string,
  userId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .delete(organizationMembersTableSQLite)
    .where(
      and(
        eq(organizationMembersTableSQLite.organizationId, organizationId),
        eq(organizationMembersTableSQLite.userId, userId)
      )
    );
}

/**
 * Update member role in an organization
 */
export async function updateOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: OrganizationRole
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(organizationMembersTableSQLite)
    .set({ role })
    .where(
      and(
        eq(organizationMembersTableSQLite.organizationId, organizationId),
        eq(organizationMembersTableSQLite.userId, userId)
      )
    );
}

/**
 * Delete an organization (and all members)
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  // Delete all members first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .delete(organizationMembersTableSQLite)
    .where(eq(organizationMembersTableSQLite.organizationId, organizationId));

  // Delete organization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .delete(organizationsTableSQLite)
    .where(eq(organizationsTableSQLite.id, organizationId));
}
