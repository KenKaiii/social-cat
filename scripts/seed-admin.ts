#!/usr/bin/env tsx
/**
 * Seed Admin User Script
 *
 * Creates a default admin user and organization if they don't exist.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 */

import bcrypt from 'bcryptjs';
import { postgresDb } from '../src/lib/db';
import { usersTablePostgres } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@socialcat.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const ADMIN_USER_ID = '1';

async function seedAdmin() {
  console.log('🌱 Seeding admin user...');

  if (!postgresDb) {
    console.error('❌ PostgreSQL database not initialized');
    process.exit(1);
  }

  try {
    // Check if admin user already exists
    const existingUser = await postgresDb
      .select()
      .from(usersTablePostgres)
      .where(eq(usersTablePostgres.id, ADMIN_USER_ID))
      .limit(1);

    if (existingUser.length === 0) {
      // Create admin user
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

      await postgresDb.insert(usersTablePostgres).values({
        id: ADMIN_USER_ID,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        name: 'Admin',
        emailVerified: 1,
      });

      console.log('✅ Created admin user:', ADMIN_EMAIL);
    } else {
      console.log('ℹ️  Admin user already exists:', ADMIN_EMAIL);
    }

    console.log('\n✅ Admin setup complete!');
    console.log('📧 Email:', ADMIN_EMAIL);
    console.log('🔑 Password:', ADMIN_PASSWORD);
    console.log('💡 Admin workflows have organizationId = NULL (not tied to clients)');
    console.log('\n💡 Login at: http://localhost:3000/auth/signin');

  } catch (error) {
    console.error('❌ Failed to seed admin user:', error);
    process.exit(1);
  }
}

// Run the seed
seedAdmin();
