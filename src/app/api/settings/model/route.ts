import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { db } from '@/lib/db';
import { appSettingsTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const MODEL_SETTING_KEY = 'openai_model';
const DEFAULT_MODEL = 'gpt-4o-mini';

// GET /api/settings/model - Get current model setting
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch model setting from database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settings = await (db as any)
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, MODEL_SETTING_KEY))
      .limit(1);

    const model = settings[0]?.value || DEFAULT_MODEL;

    return NextResponse.json({ model });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        action: 'model_setting_fetch_failed'
      },
      'Error fetching model setting'
    );
    return NextResponse.json(
      { error: 'Failed to fetch model setting' },
      { status: 500 }
    );
  }
}

// POST /api/settings/model - Save model setting (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can change global model setting
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.error(
        { userId: session.user.id },
        'ADMIN_EMAIL environment variable is not configured'
      );
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    if (session.user.email !== adminEmail) {
      logger.warn(
        { userId: session.user.id, userEmail: session.user.email },
        'Unauthorized attempt to change model setting'
      );
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { model } = body;

    if (!model || typeof model !== 'string') {
      return NextResponse.json(
        { error: 'Invalid model parameter' },
        { status: 400 }
      );
    }

    // Validate model is one of the allowed values
    const allowedModels = [
      'gpt-5',
      'gpt-5-mini',
      'gpt-4o',
      'gpt-4o-mini',
    ];

    if (!allowedModels.includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      );
    }

    // Check if setting exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = await (db as any)
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, MODEL_SETTING_KEY))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .update(appSettingsTable)
        .set({
          value: model,
          updatedAt: new Date(),
        })
        .where(eq(appSettingsTable.key, MODEL_SETTING_KEY));
    } else {
      // Insert new
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).insert(appSettingsTable).values({
        key: MODEL_SETTING_KEY,
        value: model,
      });
    }

    return NextResponse.json({ success: true, model });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        action: 'model_setting_save_failed'
      },
      'Error saving model setting'
    );
    return NextResponse.json(
      { error: 'Failed to save model setting' },
      { status: 500 }
    );
  }
}
