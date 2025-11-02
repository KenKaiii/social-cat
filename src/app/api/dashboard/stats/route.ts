import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, useSQLite } from '@/lib/db';
import { workflowsTableSQLite, workflowRunsTableSQLite } from '@/lib/schema';
import { eq, count } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Fetch all stats in parallel for better performance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = db as any;
    const [
      successfulRuns,
      failedRuns,
      activeWorkflows,
    ] = await Promise.all([
      // Count successful workflow executions
      dbAny.select({ count: count() })
        .from(workflowRunsTableSQLite)
        .where(eq(workflowRunsTableSQLite.status, 'success')) as Promise<Array<{ count: number }>>,

      // Count failed workflow executions
      dbAny.select({ count: count() })
        .from(workflowRunsTableSQLite)
        .where(eq(workflowRunsTableSQLite.status, 'error')) as Promise<Array<{ count: number }>>,

      // Count active workflows (not draft or paused)
      dbAny.select({ count: count() })
        .from(workflowsTableSQLite)
        .where(eq(workflowsTableSQLite.status, 'active')) as Promise<Array<{ count: number }>>,
    ]);

    const successCount = successfulRuns[0]?.count || 0;
    const failCount = failedRuns[0]?.count || 0;
    const activeJobsCount = activeWorkflows[0]?.count || 0;
    const totalExecutions = successCount + failCount;

    return NextResponse.json({
      automations: {
        successfulRuns: successCount,
        failedRuns: failCount,
        activeJobs: activeJobsCount,
        totalExecutions,
      },
      system: {
        database: useSQLite ? 'SQLite' : 'PostgreSQL',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
