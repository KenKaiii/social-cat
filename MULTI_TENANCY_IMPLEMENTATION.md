# Multi-Tenancy Implementation Plan

## Overview
Transform b0t into a multi-tenant agency platform where agency owners can manage multiple client organizations with complete data isolation.

## Database Schema Changes ✅ COMPLETED

### New Tables Added:
```sql
organizations
├─ id (primary key)
├─ name
├─ slug (unique)
├─ ownerId (user who created it)
├─ plan (free/pro/enterprise)
├─ settings (JSON)
├─ createdAt
└─ updatedAt

organization_members
├─ id (primary key)
├─ organizationId
├─ userId
├─ role (owner/admin/member/viewer)
└─ joinedAt
```

### Updated Tables (added organizationId):
- ✅ workflows
- ✅ workflow_runs
- ✅ user_credentials

## Role Hierarchy

```
SUPER_ADMIN (Platform owner - you)
└─ Can see/manage ALL organizations

ORGANIZATION_OWNER (Agency owner)
└─ Full access to their organization
└─ Can invite/remove members
└─ Can manage all workflows/credentials in org

ORGANIZATION_ADMIN
└─ Can manage workflows and credentials
└─ Can invite members (but not remove owner)

ORGANIZATION_MEMBER
└─ Can create/edit workflows
└─ Can use shared credentials
└─ Cannot invite users

ORGANIZATION_VIEWER
└─ Read-only access
└─ Can view workflows but not edit
```

## Implementation Steps

### Phase 1: Core Organization Logic (2-3 hours)

#### 1.1 Install Dependencies
```bash
npm install @casl/ability @casl/react
npm install slugify
```

#### 1.2 Create Organization Helper (`src/lib/organizations.ts`)
- `createOrganization(name, ownerId)` - Auto-create org on first login
- `getUserOrganizations(userId)` - Get all orgs user belongs to
- `getCurrentOrganization(userId)` - Get active org (from session/cookie)
- `switchOrganization(userId, orgId)` - Switch context
- `inviteMember(orgId, email, role)` - Add team member
- `removeMember(orgId, userId)` - Remove team member

#### 1.3 Update Auth (`src/lib/auth.ts`)
- Extend session to include `organizationId` and `role`
- Auto-create personal org on first sign-in
- Add `getServerSession()` helper that includes org context

#### 1.4 Create Permission System (`src/lib/permissions.ts`)
Using CASL:
```typescript
const defineAbilitiesFor = (user) => {
  return defineAbility((can, cannot) => {
    // Define what each role can do
    if (user.role === 'owner') {
      can('manage', 'Organization');
      can('manage', 'Workflow');
      can('manage', 'Credential');
    }
    // ... more rules
  });
};
```

### Phase 2: API Route Updates (3-4 hours)

All API routes need to filter by `organizationId`. Update:

#### Critical Routes (must update):
- ✅ `/api/workflows` - Filter by org
- ✅ `/api/workflows/[id]/*` - Verify ownership
- ✅ `/api/credentials` - Filter by org
- ✅ `/api/credentials/[id]` - Verify ownership
- ✅ `/api/logs` - Filter by org
- ✅ `/api/dashboard/stats` - Org-specific stats

#### New Routes Needed:
- `/api/organizations` - CRUD
- `/api/organizations/[id]/members` - Team management
- `/api/organizations/[id]/switch` - Change active org
- `/api/organizations/[id]/invite` - Invite member

### Phase 3: UI Updates (2-3 hours)

#### 3.1 Organization Switcher
Add to navbar - dropdown to switch between orgs

#### 3.2 Settings Page Redesign
Replace current settings with:
- **Organization** tab
  - Organization name/slug
  - Plan/billing
  - Danger zone (delete org)
- **Team** tab
  - List members
  - Invite new members
  - Manage roles
- **Personal** tab
  - User profile
  - Email/password
  - API tokens

#### 3.3 Update Dashboard
- Show org name in header
- Stats filtered by current org

### Phase 4: Data Migration (1-2 hours)

Create migration script to:
1. Create personal org for each existing user
2. Assign all existing workflows/credentials to personal org
3. Add user as owner of their personal org

```typescript
// Migration pseudo-code
for (const user of users) {
  const org = await createOrganization(`${user.name}'s Workspace`, user.id);
  await db.update(workflows).set({ organizationId: org.id }).where(eq(workflows.userId, user.id));
  await db.update(userCredentials).set({ organizationId: org.id }).where(eq(userCredentials.userId, user.id));
  await db.insert(organizationMembers).values({ organizationId: org.id, userId: user.id, role: 'owner' });
}
```

### Phase 5: Testing (1-2 hours)

Test scenarios:
1. ✅ User A cannot see User B's workflows
2. ✅ User A can switch between their orgs
3. ✅ Invited member can access org workflows
4. ✅ Member with 'viewer' role cannot edit
5. ✅ Owner can remove members
6. ✅ Credentials are org-scoped

## Breaking Changes

### For Existing Users:
- Will auto-create personal organization on next login
- All existing data will be migrated to personal org
- No manual action needed

### For Developers:
- All API routes now require `organizationId` in queries
- Session object now includes `user.organizationId`
- Must check permissions using CASL before mutations

## Environment Variables (New)

```env
# Optional: Super admin email (platform owner)
SUPER_ADMIN_EMAIL=your@email.com
```

## Security Considerations

1. **Row-Level Security** - Every query filters by `organizationId`
2. **Permission Checks** - Use CASL middleware for all mutations
3. **Credential Isolation** - Encrypted credentials are org-scoped
4. **Audit Logging** - Track org switches, invites, role changes

## Rollback Plan

If issues arise:
1. Schema has `organizationId` as nullable
2. Can temporarily fallback to `userId` filtering
3. Keep migration script reversible

## Timeline Estimate

- **Phase 1**: 2-3 hours
- **Phase 2**: 3-4 hours
- **Phase 3**: 2-3 hours
- **Phase 4**: 1-2 hours
- **Phase 5**: 1-2 hours

**Total**: 9-14 hours of focused development

## Next Steps

1. Review this plan
2. Confirm approach
3. I'll implement phase-by-phase with testing at each step
4. We can go live incrementally (phase 1-2 first, then UI)

## Questions to Consider

1. Should personal orgs be called "Personal Workspace" or user's name?
2. Should free plan have team member limits? (e.g., 1 member for free, 5 for pro)
3. Do you want org-level billing/subscription management?
4. Should workflows be shareable across orgs (templates)?
