import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { appSettingsTable } from '@/lib/schema';
import { like, sql } from 'drizzle-orm';
import { checkRateLimit, checkStrictRateLimit } from '@/lib/ratelimit';

// GET /api/automation/settings?job=<jobName>
// Retrieves all settings for a specific automation job
export async function GET(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await checkRateLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobName = req.nextUrl.searchParams.get('job');
    if (!jobName) {
      return NextResponse.json({ error: 'Job name is required' }, { status: 400 });
    }

    // Retrieve settings for this job using database LIKE query (efficient)
    const prefix = `${jobName}_`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jobSettingsArray = await (db as any)
      .select()
      .from(appSettingsTable)
      .where(like(appSettingsTable.key, `${prefix}%`)) as Array<{ id: number; key: string; value: string; updatedAt: Date | null }>;

    // Convert to object
    const jobSettings = jobSettingsArray.reduce((acc: Record<string, unknown>, setting: { key: string; value: string }) => {
      const settingKey = setting.key.replace(prefix, '');
      // Parse JSON values
      try {
        acc[settingKey] = JSON.parse(setting.value);
      } catch {
        acc[settingKey] = setting.value;
      }
      return acc;
    }, {} as Record<string, unknown>);

    return NextResponse.json(jobSettings);
  } catch (error) {
    console.error('Error fetching automation settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST /api/automation/settings
// Saves settings for a specific automation job
export async function POST(req: NextRequest) {
  // Apply stricter rate limiting for mutations
  const rateLimitResult = await checkStrictRateLimit(req);
  if (rateLimitResult) return rateLimitResult;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobName, settings } = body;

    if (!jobName || !settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Job name and settings object are required' },
        { status: 400 }
      );
    }

    // Save all settings using UPSERT (single operation per setting)
    const prefix = `${jobName}_`;
    const settingsToUpsert = Object.entries(settings).map(([key, value]) => ({
      key: `${prefix}${key}`,
      value: JSON.stringify(value),
      updatedAt: new Date(),
    }));

    // Use UPSERT pattern for efficient database operations
    for (const setting of settingsToUpsert) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .insert(appSettingsTable)
        .values(setting)
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: {
            value: sql`excluded.value`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving automation settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
