import { db } from '@/lib/db';
import { userCredentialsTable } from '@/lib/schema';
import { encrypt, decrypt } from '@/lib/encryption';
import { eq, and, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

/**
 * Workflow Credentials Manager
 *
 * Securely store and retrieve API keys, tokens, and secrets for workflows.
 * All credentials are encrypted at rest using AES-256.
 */

export interface CredentialInput {
  platform: string; // openai, anthropic, stripe, slack, custom
  name: string; // User-friendly name
  value?: string; // For single-field credentials (backward compatible)
  fields?: Record<string, string>; // For multi-field credentials
  type: 'api_key' | 'token' | 'secret' | 'connection_string' | 'multi_field';
  metadata?: Record<string, unknown>; // Optional extra info
}

/**
 * Store a new credential for a user
 */
export async function storeCredential(
  userId: string,
  input: CredentialInput,
  organizationId?: string
): Promise<{ id: string }> {
  logger.info(
    {
      userId,
      platform: input.platform,
      type: input.type,
      organizationId,
      action: 'credential_created'
    },
    'Storing credential'
  );

  const id = randomUUID();
  let encryptedValue = '';
  let metadata = input.metadata || {};

  // Handle single-field credential (backward compatible)
  if (input.value) {
    encryptedValue = encrypt(input.value);
  }

  // Handle multi-field credential (new approach)
  if (input.fields && Object.keys(input.fields).length > 0) {
    metadata = {
      ...metadata,
      fields: Object.entries(input.fields).reduce((acc, [key, value]) => {
        acc[key] = encrypt(value);
        return acc;
      }, {} as Record<string, string>)
    };
  }

  await db.insert(userCredentialsTable).values({
    id,
    userId,
    organizationId: organizationId || undefined,
    platform: input.platform.toLowerCase(),
    name: input.name,
    encryptedValue,
    type: input.type,
    metadata: metadata as Record<string, unknown>,
  });

  logger.info(
    {
      id,
      platform: input.platform,
      userId,
      organizationId,
      action: 'credential_created',
      timestamp: new Date().toISOString()
    },
    'Credential stored successfully'
  );

  return { id };
}

/**
 * Get a credential for a user and platform
 */
export async function getCredential(
  userId: string,
  platform: string
): Promise<string | null> {
  logger.info({ userId, platform }, 'Retrieving credential');

  const credentials = await db
    .select()
    .from(userCredentialsTable)
    .where(
      and(
        eq(userCredentialsTable.userId, userId),
        eq(userCredentialsTable.platform, platform.toLowerCase())
      )
    )
    .limit(1);

  if (credentials.length === 0) {
    logger.warn({ userId, platform }, 'Credential not found');
    return null;
  }

  const credential = credentials[0];

  // Note: lastUsed timestamp update removed for performance
  // Credentials are cached, so this was creating unnecessary write load
  // The lastUsed field is still available for manual tracking if needed

  const decryptedValue = decrypt(credential.encryptedValue);

  logger.info(
    {
      userId,
      platform,
      credentialId: credential.id,
      action: 'credential_accessed',
      timestamp: new Date().toISOString()
    },
    'Credential retrieved'
  );

  return decryptedValue;
}

/**
 * List all credentials for a user (without decrypted values)
 */
export async function listCredentials(
  userId: string,
  organizationId?: string
): Promise<
  Array<{
    id: string;
    platform: string;
    name: string;
    type: string;
    createdAt: Date | null;
    lastUsed: Date | null;
  }>
> {
  // Build where clause
  const whereConditions = [eq(userCredentialsTable.userId, userId)];

  if (organizationId) {
    // Filter by specific organization
    whereConditions.push(eq(userCredentialsTable.organizationId, organizationId));
  } else {
    // Show only admin's personal credentials (not tied to any organization)
    whereConditions.push(isNull(userCredentialsTable.organizationId));
  }

  const credentials = await db
    .select({
      id: userCredentialsTable.id,
      platform: userCredentialsTable.platform,
      name: userCredentialsTable.name,
      type: userCredentialsTable.type,
      createdAt: userCredentialsTable.createdAt,
      lastUsed: userCredentialsTable.lastUsed,
    })
    .from(userCredentialsTable)
    .where(and(...whereConditions));

  return credentials;
}

/**
 * Delete a credential
 */
export async function deleteCredential(userId: string, credentialId: string): Promise<void> {
  logger.info(
    {
      userId,
      credentialId,
      action: 'credential_delete_attempt',
      timestamp: new Date().toISOString()
    },
    'Deleting credential'
  );

  await db
    .delete(userCredentialsTable)
    .where(
      and(
        eq(userCredentialsTable.id, credentialId),
        eq(userCredentialsTable.userId, userId)
      )
    );

  logger.info(
    {
      userId,
      credentialId,
      action: 'credential_deleted',
      timestamp: new Date().toISOString()
    },
    'Credential deleted'
  );
}

/**
 * Update a credential value
 */
export async function updateCredential(
  userId: string,
  credentialId: string,
  newValue: string
): Promise<void> {
  logger.info(
    {
      userId,
      credentialId,
      action: 'credential_update_attempt',
      timestamp: new Date().toISOString()
    },
    'Updating credential'
  );

  const encryptedValue = encrypt(newValue);

  await db
    .update(userCredentialsTable)
    .set({ encryptedValue })
    .where(
      and(
        eq(userCredentialsTable.id, credentialId),
        eq(userCredentialsTable.userId, userId)
      )
    );

  logger.info(
    {
      userId,
      credentialId,
      action: 'credential_updated',
      timestamp: new Date().toISOString()
    },
    'Credential updated'
  );
}

/**
 * Update a credential name
 */
export async function updateCredentialName(
  userId: string,
  credentialId: string,
  newName: string
): Promise<void> {
  logger.info(
    {
      userId,
      credentialId,
      action: 'credential_name_update_attempt',
      timestamp: new Date().toISOString()
    },
    'Updating credential name'
  );

  await db
    .update(userCredentialsTable)
    .set({ name: newName })
    .where(
      and(
        eq(userCredentialsTable.id, credentialId),
        eq(userCredentialsTable.userId, userId)
      )
    );

  logger.info(
    {
      userId,
      credentialId,
      action: 'credential_name_updated',
      timestamp: new Date().toISOString()
    },
    'Credential name updated'
  );
}

/**
 * Get credential fields (supports both single and multi-field credentials)
 * Returns a Record with field names as keys and decrypted values
 */
export async function getCredentialFields(
  userId: string,
  platform: string,
  organizationId?: string
): Promise<Record<string, string> | null> {
  logger.info({ userId, platform, organizationId }, 'Retrieving credential fields');

  // Build where clause
  const whereConditions = [
    eq(userCredentialsTable.userId, userId),
    eq(userCredentialsTable.platform, platform.toLowerCase())
  ];

  if (organizationId) {
    whereConditions.push(eq(userCredentialsTable.organizationId, organizationId));
  } else {
    whereConditions.push(isNull(userCredentialsTable.organizationId));
  }

  const credentials = await db
    .select()
    .from(userCredentialsTable)
    .where(and(...whereConditions))
    .limit(1);

  if (credentials.length === 0) {
    logger.warn({ userId, platform, organizationId }, 'Credential not found');
    return null;
  }

  const credential = credentials[0];

  // Note: lastUsed timestamp update removed for performance
  // Credentials are cached, so this was creating unnecessary write load
  // The lastUsed field is still available for manual tracking if needed

  // Parse metadata if it's a string (PostgreSQL JSONB can return as string)
  const metadata = typeof credential.metadata === 'string'
    ? JSON.parse(credential.metadata)
    : credential.metadata;

  // Check if multi-field credential
  if (metadata && typeof metadata === 'object' && 'fields' in metadata) {
    const fields = metadata.fields as Record<string, string>;
    const decryptedFields: Record<string, string> = {};

    for (const [key, encryptedValue] of Object.entries(fields)) {
      decryptedFields[key] = decrypt(encryptedValue);
    }

    logger.info({ userId, platform, fieldCount: Object.keys(decryptedFields).length }, 'Multi-field credential retrieved');
    return decryptedFields;
  }

  // Fallback to single-field credential (backward compatible)
  if (credential.encryptedValue) {
    const decryptedValue = decrypt(credential.encryptedValue);
    logger.info({ userId, platform }, 'Single-field credential retrieved');
    return { value: decryptedValue };
  }

  logger.warn({ userId, platform }, 'Credential found but has no value');
  return null;
}

/**
 * Check if a credential exists for a platform
 */
export async function hasCredential(
  userId: string,
  platform: string,
  organizationId?: string
): Promise<boolean> {
  const whereConditions = [
    eq(userCredentialsTable.userId, userId),
    eq(userCredentialsTable.platform, platform.toLowerCase())
  ];

  if (organizationId) {
    whereConditions.push(eq(userCredentialsTable.organizationId, organizationId));
  } else {
    whereConditions.push(isNull(userCredentialsTable.organizationId));
  }

  const credentials = await db
    .select({ id: userCredentialsTable.id })
    .from(userCredentialsTable)
    .where(and(...whereConditions))
    .limit(1);

  return credentials.length > 0;
}
