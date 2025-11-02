import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { OrganizationRole } from './organizations';

// Define possible actions
type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';

// Define subjects (resources)
type Subjects =
  | 'Organization'
  | 'Workflow'
  | 'Credential'
  | 'WorkflowRun'
  | 'OrganizationMember'
  | 'all';

// Ability type
export type AppAbility = MongoAbility<[Actions, Subjects]>;

// User context for permission checks
export interface UserContext {
  id: string;
  organizationId: string;
  role: OrganizationRole;
  isSuperAdmin?: boolean;
}

/**
 * Define permissions based on user's role in their organization
 */
export function defineAbilitiesFor(user: UserContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Super Admin (Platform owner) - can do everything across all orgs
  if (user.isSuperAdmin) {
    can('manage', 'all');
    return build();
  }

  // Organization Owner - full control within their organization
  if (user.role === 'owner') {
    can('manage', 'Organization', { id: user.organizationId });
    can('manage', 'Workflow', { organizationId: user.organizationId });
    can('manage', 'Credential', { organizationId: user.organizationId });
    can('manage', 'WorkflowRun', { organizationId: user.organizationId });
    can('manage', 'OrganizationMember', { organizationId: user.organizationId });
  }

  // Organization Admin - can manage resources but not the org itself
  else if (user.role === 'admin') {
    can('read', 'Organization', { id: user.organizationId });
    can('update', 'Organization', { id: user.organizationId }); // Can update org settings
    can('manage', 'Workflow', { organizationId: user.organizationId });
    can('manage', 'Credential', { organizationId: user.organizationId });
    can('manage', 'WorkflowRun', { organizationId: user.organizationId });
    can('create', 'OrganizationMember', { organizationId: user.organizationId }); // Can invite
    can('read', 'OrganizationMember', { organizationId: user.organizationId });
    cannot('delete', 'OrganizationMember', { role: 'owner' }); // Cannot remove owner
  }

  // Organization Member - can create and manage their own workflows
  else if (user.role === 'member') {
    can('read', 'Organization', { id: user.organizationId });
    can('create', 'Workflow', { organizationId: user.organizationId });
    can('read', 'Workflow', { organizationId: user.organizationId });
    can('update', 'Workflow', { organizationId: user.organizationId, userId: user.id }); // Own workflows
    can('delete', 'Workflow', { organizationId: user.organizationId, userId: user.id }); // Own workflows
    can('read', 'Credential', { organizationId: user.organizationId }); // Can use shared credentials
    can('create', 'Credential', { organizationId: user.organizationId }); // Can create credentials
    can('update', 'Credential', { organizationId: user.organizationId, userId: user.id }); // Own credentials
    can('delete', 'Credential', { organizationId: user.organizationId, userId: user.id }); // Own credentials
    can('read', 'WorkflowRun', { organizationId: user.organizationId });
    can('read', 'OrganizationMember', { organizationId: user.organizationId });
  }

  // Organization Viewer - read-only access
  else if (user.role === 'viewer') {
    can('read', 'Organization', { id: user.organizationId });
    can('read', 'Workflow', { organizationId: user.organizationId });
    can('read', 'Credential', { organizationId: user.organizationId }); // Can see what credentials exist
    can('read', 'WorkflowRun', { organizationId: user.organizationId });
    can('read', 'OrganizationMember', { organizationId: user.organizationId });
  }

  return build();
}

/**
 * Check if user can perform action on subject
 */
export function can(
  user: UserContext,
  action: Actions,
  subject: Subjects,
  field?: any
): boolean {
  const ability = defineAbilitiesFor(user);
  return ability.can(action, subject, field);
}

/**
 * Throw error if user cannot perform action
 */
export function authorize(
  user: UserContext,
  action: Actions,
  subject: Subjects,
  field?: any
): void {
  if (!can(user, action, subject, field)) {
    throw new Error(`You don't have permission to ${action} ${subject}`);
  }
}
