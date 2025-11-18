import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { logger } from './logger';

/**
 * NextAuth.js v5 (Auth.js) Configuration
 *
 * Multi-tenant authentication with organization context
 * Each user belongs to one or more organizations
 * Personal organization is auto-created on first sign-in
 *
 * Supports both:
 * - Admin login via environment variables (backward compatibility)
 * - Database users with hashed passwords
 *
 * NOTE: Organizations module is lazy-loaded to avoid Edge Runtime issues
 */

// Import OrganizationRole type only (types are stripped at runtime)
import type { OrganizationRole } from './organizations';

// Lazy-load organization functions to avoid bundling database drivers in Edge Runtime
const getOrganizationFunctions = async () => {
  // Only load in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'edge') {
    return null;
  }
  const orgs = await import('./organizations');
  return {
    createOrganization: orgs.createOrganization,
    getUserOrganizations: orgs.getUserOrganizations,
  };
};

// Extend NextAuth types to include organization context
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      role: OrganizationRole;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name: string;
  }
}

// Extend JWT token type (for NextAuth v5)
declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    organizationId?: string;
    role?: OrganizationRole;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: false, // Disable debug warnings in development
  trustHost: true, // Required for production deployments (Railway, Vercel, etc.)
  providers: [
    // Simple Email/Password Authentication
    // For single user app - credentials stored in environment variables
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn(
            {
              email: credentials?.email,
              action: 'user_signin_failed',
              timestamp: new Date().toISOString(),
              reason: 'missing_credentials',
              provider: 'credentials',
            },
            'Sign-in attempt failed: missing email or password'
          );
          return null;
        }

        const email = credentials.email as string;

        // First check database users
        if (process.env.NEXT_RUNTIME !== 'edge') {
          try {
            const { db } = await import('./db');
            const { usersTable } = await import('./schema');
            const { eq } = await import('drizzle-orm');

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [user] = await (db as any)
              .select()
              .from(usersTable)
              .where(eq(usersTable.email, email))
              .limit(1);

            if (user) {
              // Verify password
              const passwordMatch = await bcrypt.compare(
                credentials.password as string,
                user.password
              );

              if (passwordMatch) {
                logger.info(
                  {
                    userId: user.id,
                    email: user.email,
                    action: 'user_signin_success',
                    timestamp: new Date().toISOString(),
                    metadata: { provider: 'credentials', userSource: 'database' },
                  },
                  'User signed in successfully'
                );
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name || user.email,
                };
              } else {
                logger.warn(
                  {
                    email: user.email,
                    userId: user.id,
                    action: 'user_signin_failed',
                    timestamp: new Date().toISOString(),
                    reason: 'invalid_password',
                    provider: 'credentials',
                  },
                  'Sign-in attempt failed: invalid password'
                );
              }
            }
          } catch (error) {
            logger.error(
              {
                email,
                action: 'user_signin_failed',
                timestamp: new Date().toISOString(),
                reason: 'database_lookup_error',
                provider: 'credentials',
                error: error instanceof Error ? error.message : String(error),
              },
              'Database user lookup failed during sign-in'
            );
            // Fall through to admin check
          }
        }

        // Fallback: Check against environment variables (admin user - backward compatibility)
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
          throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
        }

        if (email === adminEmail) {
          // Check if admin password is hashed (starts with $2a$, $2b$, or $2y$ for bcrypt)
          const isPasswordValid = adminPassword.startsWith('$2')
            ? await bcrypt.compare(credentials.password as string, adminPassword)
            : credentials.password === adminPassword;

          if (isPasswordValid) {
            // Warn if using plaintext password
            if (!adminPassword.startsWith('$2')) {
              logger.warn(
                { email: adminEmail },
                'Admin using plaintext password - please hash with bcrypt and update ADMIN_PASSWORD env var'
              );
            }

            logger.info(
              {
                userId: '1',
                email: adminEmail,
                action: 'user_signin_success',
                timestamp: new Date().toISOString(),
                metadata: { provider: 'credentials', userSource: 'environment' },
              },
              'Admin user signed in successfully'
            );
            return {
              id: '1',
              email: adminEmail,
              name: 'Admin',
            };
          }
        }

        logger.warn(
          {
            email,
            action: 'user_signin_failed',
            timestamp: new Date().toISOString(),
            reason: 'invalid_credentials',
            provider: 'credentials',
          },
          'Sign-in attempt failed: invalid credentials'
        );
        return null;
      },
    }),
  ],

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user',
  },

  callbacks: {
    async signIn({ user, account }) {
      logger.debug(
        {
          userId: user.id,
          email: user.email,
          provider: account?.provider,
          action: 'signin_callback_start',
          timestamp: new Date().toISOString(),
        },
        'Sign-in callback initiated'
      );

      // Auto-create personal organization on first sign-in
      // Skip in Edge Runtime (organization functions not available)
      if (user?.id && process.env.NEXT_RUNTIME !== 'edge') {
        try {
          const orgFns = await getOrganizationFunctions();
          if (!orgFns) {
            logger.warn(
              {
                userId: user.id,
                action: 'organization_context_unavailable',
                timestamp: new Date().toISOString(),
                reason: 'edge_runtime',
              },
              'Organization functions not available (Edge Runtime)'
            );
            return true;
          }

          const existingOrgs = await orgFns.getUserOrganizations(user.id);

          if (existingOrgs.length === 0) {
            // First time sign-in - create personal organization
            const orgName = user.name ? `${user.name}'s Workspace` : 'My Workspace';
            const org = await orgFns.createOrganization(orgName, user.id);

            logger.info(
              {
                userId: user.id,
                organizationId: org.id,
                organizationName: orgName,
                action: 'organization_auto_created',
                timestamp: new Date().toISOString(),
                metadata: { userEmail: user.email },
              },
              'Personal organization automatically created for new user'
            );
          }
        } catch (error) {
          logger.error(
            {
              userId: user.id,
              email: user.email,
              action: 'organization_creation_failed',
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
            },
            'Failed to create personal organization during sign-in'
          );
          // Don't block sign-in if org creation fails
        }
      }

      return true;
    },

    async session({ session, token }) {
      // Add user id to session
      if (token.sub) {
        session.user.id = token.sub;
      }

      // Add organization context
      if (token.organizationId && token.role) {
        session.user.organizationId = token.organizationId;
        session.user.role = token.role;
      }

      return session;
    },

    async jwt({ token, user, trigger }) {
      // Add user id to token on first sign in
      if (user) {
        token.id = user.id;
      }

      // Load organization context if not already present
      // or if session is being updated
      // Skip in Edge Runtime
      if (token.id && (!token.organizationId || trigger === 'update') && process.env.NEXT_RUNTIME !== 'edge') {
        try {
          const orgFns = await getOrganizationFunctions();
          if (!orgFns) {
            logger.warn(
              {
                userId: token.id,
                action: 'organization_context_unavailable',
                timestamp: new Date().toISOString(),
                reason: 'edge_runtime',
              },
              'Organization functions not available (Edge Runtime) during JWT callback'
            );
            return token;
          }

          const orgs = await orgFns.getUserOrganizations(token.id as string);

          if (orgs.length > 0) {
            // Use first organization as default
            // (can be changed via org switcher UI later)
            const org = orgs[0];
            token.organizationId = org.id;
            token.role = org.role;

            logger.debug(
              {
                userId: token.id,
                organizationId: org.id,
                role: org.role,
                action: 'organization_context_loaded',
                timestamp: new Date().toISOString(),
                metadata: { trigger },
              },
              'Organization context loaded into JWT token'
            );
          }
        } catch (error) {
          logger.error(
            {
              userId: token.id,
              action: 'organization_context_load_failed',
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
              metadata: { trigger },
            },
            'Failed to load organization context during JWT callback'
          );
        }
      }

      return token;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

/**
 * Helper: Get current session with organization context
 * Use this instead of auth() directly to ensure organization data is present
 */
export async function getServerSession() {
  const session = await auth();

  if (!session?.user?.id) {
    logger.debug(
      {
        action: 'get_server_session_failed',
        timestamp: new Date().toISOString(),
        reason: 'no_active_session',
      },
      'Failed to retrieve server session: no active user'
    );
    return null;
  }

  // Ensure organization context is loaded
  if (!session.user.organizationId) {
    logger.warn(
      {
        userId: session.user.id,
        action: 'session_missing_organization_context',
        timestamp: new Date().toISOString(),
      },
      'Session missing organization context, attempting to reload'
    );

    // Try to load organization context
    // Skip in Edge Runtime
    if (process.env.NEXT_RUNTIME === 'edge') {
      logger.warn(
        {
          userId: session.user.id,
          action: 'organization_context_load_failed',
          timestamp: new Date().toISOString(),
          reason: 'edge_runtime',
        },
        'Cannot load organization context in Edge Runtime'
      );
      return null;
    }

    try {
      const orgFns = await getOrganizationFunctions();
      if (!orgFns) {
        logger.error(
          {
            userId: session.user.id,
            action: 'organization_context_load_failed',
            timestamp: new Date().toISOString(),
            reason: 'org_functions_unavailable',
          },
          'Organization functions not available'
        );
        return null;
      }

      const orgs = await orgFns.getUserOrganizations(session.user.id);
      if (orgs.length > 0) {
        const org = orgs[0];
        session.user.organizationId = org.id;
        session.user.role = org.role;

        logger.debug(
          {
            userId: session.user.id,
            organizationId: org.id,
            role: org.role,
            action: 'session_organization_context_loaded',
            timestamp: new Date().toISOString(),
          },
          'Organization context successfully loaded for session'
        );
      } else {
        logger.error(
          {
            userId: session.user.id,
            action: 'session_no_organizations_found',
            timestamp: new Date().toISOString(),
            reason: 'user_has_no_organizations',
          },
          'User has no organizations'
        );
        return null;
      }
    } catch (error) {
      logger.error(
        {
          userId: session.user.id,
          action: 'session_organization_context_load_failed',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to load organization context for session'
      );
      return null;
    }
  }

  return session;
}

/**
 * Helper: Require authentication with organization context
 * Throws if user is not authenticated or has no organization
 */
export async function requireAuth() {
  const session = await getServerSession();

  if (!session) {
    logger.warn(
      {
        action: 'authorization_failed',
        timestamp: new Date().toISOString(),
        reason: 'no_active_session',
      },
      'Authorization failed: no active session'
    );
    throw new Error('Unauthorized: No active session');
  }

  if (!session.user.organizationId) {
    logger.warn(
      {
        userId: session.user.id,
        action: 'authorization_failed',
        timestamp: new Date().toISOString(),
        reason: 'no_organization_context',
      },
      'Authorization failed: user has no organization context'
    );
    throw new Error('Unauthorized: No organization context');
  }

  return session;
}

/**
 * Helper: Get current organization ID from session
 * Returns null if not authenticated
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const session = await getServerSession();
  return session?.user?.organizationId ?? null;
}

/**
 * Helper: Check if current user has specific role
 */
export async function hasRole(role: OrganizationRole): Promise<boolean> {
  const session = await getServerSession();

  if (!session?.user?.role) {
    return false;
  }

  // Owner has all permissions
  if (session.user.role === 'owner') {
    return true;
  }

  // Admin has admin, member, and viewer permissions
  if (session.user.role === 'admin' && (role === 'admin' || role === 'member' || role === 'viewer')) {
    return true;
  }

  // Member has member and viewer permissions
  if (session.user.role === 'member' && (role === 'member' || role === 'viewer')) {
    return true;
  }

  // Check exact role match
  return session.user.role === role;
}
