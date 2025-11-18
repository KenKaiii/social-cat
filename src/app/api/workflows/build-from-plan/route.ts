import { getAgentWorkspaceDir } from '@/lib/agent-workspace';
import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/workflows/build-from-plan
// Builds a workflow from a YAML plan file (no auth required for agent use)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { planPath, autoFix = true } = body; // Auto-fix enabled by default

    if (!planPath || typeof planPath !== 'string') {
      return new Response('planPath is required', { status: 400 });
    }

    const workspaceDir = getAgentWorkspaceDir();
    const fullPlanPath = join(workspaceDir, planPath);

    // Run the build script from the main project
    const scriptPath = join(process.cwd(), 'scripts/build-workflow-from-plan.ts');

    try {
      let output = '';
      try {
        const autoFixFlag = autoFix ? '--auto-fix' : '';
        output = execSync(`npx tsx ${scriptPath} ${autoFixFlag} ${fullPlanPath} --skip-dry-run --skip-import`, {
          cwd: process.cwd(),
          encoding: 'utf-8',
          timeout: 60000, // 60 second timeout
        });
      } catch (error: unknown) {
        // execSync throws on non-zero exit, capture the output
        if (error && typeof error === 'object' && 'stdout' in error) {
          output = (error as { stdout: string }).stdout || '';
        }
        if (error && typeof error === 'object' && 'stderr' in error) {
          const stderr = (error as { stderr: string }).stderr || '';
          return Response.json({
            success: false,
            error: stderr || 'Build script failed',
            output,
          }, { status: 500 });
        }
        throw error;
      }

      // Extract the generated JSON file path from the output
      const jsonPathMatch = output.match(/Workflow JSON created: (.+\.json)/);
      if (!jsonPathMatch) {
        return Response.json({
          success: false,
          error: 'Failed to extract JSON path from build output',
          output,
        });
      }

      const jsonPath = jsonPathMatch[1];
      const workflowJson = readFileSync(jsonPath, 'utf-8');

      // Auto-import the workflow using the import-test endpoint
      try {
        const importResponse = await fetch('http://localhost:3123/api/workflows/import-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowJson }),
        });

        if (!importResponse.ok) {
          const importError = await importResponse.json();
          return Response.json({
            success: false,
            error: 'Build succeeded but import failed',
            importError,
            workflowJson,
            output,
          }, { status: 500 });
        }

        const importResult = await importResponse.json();

        return Response.json({
          success: true,
          workflowJson,
          jsonPath: jsonPath.replace(workspaceDir, '').replace(/^\//, ''),
          output,
          imported: true,
          workflowId: importResult.id,
          workflowName: importResult.name,
        });
      } catch (importError) {
        return Response.json({
          success: false,
          error: 'Build succeeded but auto-import failed',
          importError: importError instanceof Error ? importError.message : 'Unknown error',
          workflowJson,
          output,
        }, { status: 500 });
      }
    } catch (error) {
      const errorOutput = error instanceof Error && 'stdout' in error
        ? (error as { stdout?: string; stderr?: string }).stdout || (error as { stdout?: string; stderr?: string }).stderr || error.message
        : error instanceof Error ? error.message : 'Unknown error';

      return Response.json({
        success: false,
        error: errorOutput,
      }, { status: 500 });
    }
  } catch (error) {
    logger.error({ error }, 'Build from plan error');
    return new Response('Internal server error', { status: 500 });
  }
}
