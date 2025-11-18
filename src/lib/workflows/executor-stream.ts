import { db } from '@/lib/db';
import {
  workflowsTable,
  workflowRunsTable,
  organizationsTable,
  accountsTable,
  userCredentialsTable
} from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { executeStep, normalizeStep, type WorkflowStep } from './control-flow';
import {
  buildDependencyGraph,
  groupIntoWaves,
} from './parallel-executor';

/**
 * Progress Event Types
 * Events emitted during workflow execution for real-time UI updates
 */
export type ProgressEvent =
  | { type: 'workflow_started'; workflowId: string; runId: string; totalSteps: number }
  | { type: 'step_started'; stepId: string; stepIndex: number; totalSteps: number; module: string }
  | { type: 'step_completed'; stepId: string; stepIndex: number; duration: number; output?: unknown }
  | { type: 'step_failed'; stepId: string; stepIndex: number; error: string }
  | { type: 'workflow_completed'; runId: string; duration: number; output?: unknown }
  | { type: 'workflow_failed'; runId: string; error: string; errorStep?: string };

export type ProgressCallback = (event: ProgressEvent) => void;

/**
 * Execute a workflow with real-time progress streaming
 * Same as executeWorkflow but emits progress events via callback
 */
export async function executeWorkflowWithProgress(
  workflowId: string,
  userId: string,
  triggerType: string,
  triggerData?: Record<string, unknown>,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; output?: unknown; error?: string; errorStep?: string }> {
  logger.info({ workflowId, userId, triggerType }, 'Starting workflow execution with progress streaming');

  const runId = randomUUID();
  const startedAt = new Date();

  try {
    // Get workflow configuration
    const workflows = await db
      .select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, workflowId))
      .limit(1);

    if (workflows.length === 0) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    const workflow = workflows[0];

    // Check organization status
    if (workflow.organizationId) {
      const orgs = await db
        .select()
        .from(organizationsTable)
        .where(eq(organizationsTable.id, workflow.organizationId))
        .limit(1);
      const organization = orgs[0];

      if (organization && organization.status === 'inactive') {
        throw new Error('Cannot execute workflow: client organization is inactive');
      }
    }

    // Create workflow run record
    await db.insert(workflowRunsTable).values({
      id: runId,
      workflowId,
      userId,
      organizationId: workflow.organizationId ? workflow.organizationId : null,
      status: 'running',
      triggerType,
      triggerData: triggerData ? JSON.stringify(triggerData) : null,
      startedAt,
    });

    // Parse config
    const config = (typeof workflow.config === 'string'
      ? JSON.parse(workflow.config)
      : workflow.config) as {
      steps: Array<{
        id: string;
        module: string;
        inputs: Record<string, unknown>;
        outputAs?: string;
      }>;
      returnValue?: string;
    };

    logger.info({ workflowId, stepCount: config.steps.length }, 'Executing workflow steps');

    // Emit workflow started event
    onProgress?.({
      type: 'workflow_started',
      workflowId,
      runId,
      totalSteps: config.steps.length,
    });

    // Load user credentials
    const userCredentials = await loadUserCredentials(userId);

    // Initialize execution context
    const context = {
      variables: {
        user: {
          id: userId,
          ...userCredentials,
        },
        credential: userCredentials, // Add credential namespace for {{credential.platform}} syntax
        trigger: triggerData || {},
        ...userCredentials,
      },
      workflowId,
      runId,
      userId,
      config, // Include config for UI-set overrides (system prompts, etc.)
    };

    let lastOutput: unknown = null;

    // Normalize all steps first
    const normalizedSteps = config.steps.map((step) => normalizeStep(step) as WorkflowStep);

    // Build dependency graph and group into parallel waves
    const graph = buildDependencyGraph(normalizedSteps, context);
    const waves = groupIntoWaves(normalizedSteps, graph);

    logger.info(
      {
        workflowId,
        totalWaves: waves.length,
        waves: waves.map((wave, idx) => ({
          wave: idx + 1,
          steps: wave.map((s) => s.id),
          count: wave.length,
        })),
      },
      'Grouped steps into execution waves for parallel execution'
    );

    // Execute each wave sequentially, steps within wave in parallel
    for (let waveIdx = 0; waveIdx < waves.length; waveIdx++) {
      const wave = waves[waveIdx];

      if (wave.length === 1) {
        // Single step - execute directly
        const step = wave[0];
        const stepIndex = normalizedSteps.indexOf(step);
        const stepStartTime = Date.now();

        logger.info({ workflowId, runId, stepId: step.id, stepIndex }, 'Executing single step in wave');

        // Emit step started event
        const modulePath = 'module' in step ? (step.module as string) : 'unknown';
        onProgress?.({
          type: 'step_started',
          stepId: step.id,
          stepIndex,
          totalSteps: config.steps.length,
          module: modulePath,
        });

        try {
          lastOutput = await executeStep(
            step,
            context,
            executeModuleFunction,
            resolveVariables
          );

          const stepDuration = Date.now() - stepStartTime;

          onProgress?.({
            type: 'step_completed',
            stepId: step.id,
            stepIndex,
            duration: stepDuration,
            output: lastOutput,
          });
        } catch (error) {
          logger.error({ error, workflowId, runId, stepId: step.id }, 'Step execution failed');

          onProgress?.({
            type: 'step_failed',
            stepId: step.id,
            stepIndex,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // Update workflow run with error
          const completedAt = new Date();
          await db
            .update(workflowRunsTable)
            .set({
              status: 'error',
              completedAt,
              duration: completedAt.getTime() - startedAt.getTime(),
              error: error instanceof Error ? error.message : 'Unknown error',
              errorStep: step.id,
            })
            .where(eq(workflowRunsTable.id, runId));

          await db
            .update(workflowsTable)
            .set({
              lastRun: completedAt,
              lastRunStatus: 'error',
              lastRunError: error instanceof Error ? error.message : 'Unknown error',
              runCount: sql`${workflowsTable.runCount} + 1`,
            })
            .where(eq(workflowsTable.id, workflowId));

          onProgress?.({
            type: 'workflow_failed',
            runId,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStep: step.id,
          });

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStep: step.id,
          };
        }
      } else {
        // Multiple steps - execute in parallel
        logger.info(
          {
            waveNumber: waveIdx + 1,
            stepCount: wave.length,
            stepIds: wave.map((s) => s.id),
          },
          'Executing steps in parallel (wave execution)'
        );

        // Emit started events for all steps in parallel wave
        for (const step of wave) {
          const stepIndex = normalizedSteps.indexOf(step);
          const modulePath = 'module' in step ? (step.module as string) : 'unknown';
          onProgress?.({
            type: 'step_started',
            stepId: step.id,
            stepIndex,
            totalSteps: config.steps.length,
            module: modulePath,
          });
        }

        const stepStartTimes = new Map<string, number>();
        wave.forEach((step) => stepStartTimes.set(step.id, Date.now()));

        try {
          const outputs = await Promise.all(
            wave.map(async (step) => {
              try {
                const output = await executeStep(
                  step,
                  context,
                  executeModuleFunction,
                  resolveVariables
                );
                return { success: true, stepId: step.id, output };
              } catch (error) {
                return {
                  success: false,
                  stepId: step.id,
                  error: error instanceof Error ? error.message : 'Unknown error',
                };
              }
            })
          );

          // Check for failures
          const failed = outputs.find((o) => !o.success);
          if (failed) {
            const step = wave.find((s) => s.id === failed.stepId)!;
            const stepIndex = normalizedSteps.indexOf(step);

            logger.error({ workflowId, runId, stepId: failed.stepId }, 'Parallel step execution failed');

            onProgress?.({
              type: 'step_failed',
              stepId: failed.stepId,
              stepIndex,
              error: failed.error || 'Unknown error',
            });

            // Update workflow run with error
            const completedAt = new Date();
            await db
              .update(workflowRunsTable)
              .set({
                status: 'error',
                completedAt,
                duration: completedAt.getTime() - startedAt.getTime(),
                error: failed.error || 'Unknown error',
                errorStep: failed.stepId,
              })
              .where(eq(workflowRunsTable.id, runId));

            await db
              .update(workflowsTable)
              .set({
                lastRun: completedAt,
                lastRunStatus: 'error',
                lastRunError: failed.error || 'Unknown error',
                runCount: sql`${workflowsTable.runCount} + 1`,
              })
              .where(eq(workflowsTable.id, workflowId));

            onProgress?.({
              type: 'workflow_failed',
              runId,
              error: failed.error || 'Unknown error',
              errorStep: failed.stepId,
            });

            return {
              success: false,
              error: failed.error || 'Unknown error',
              errorStep: failed.stepId,
            };
          }

          // All succeeded - emit completed events
          for (const result of outputs) {
            const step = wave.find((s) => s.id === result.stepId)!;
            const stepIndex = normalizedSteps.indexOf(step);
            const stepStartTime = stepStartTimes.get(result.stepId) || Date.now();
            const stepDuration = Date.now() - stepStartTime;

            onProgress?.({
              type: 'step_completed',
              stepId: result.stepId,
              stepIndex,
              duration: stepDuration,
              output: result.output,
            });

            lastOutput = result.output;
          }
        } catch (error) {
          logger.error({ error, workflowId, runId }, 'Parallel wave execution failed');

          const completedAt = new Date();
          await db
            .update(workflowRunsTable)
            .set({
              status: 'error',
              completedAt,
              duration: completedAt.getTime() - startedAt.getTime(),
              error: error instanceof Error ? error.message : 'Unknown error',
            })
            .where(eq(workflowRunsTable.id, runId));

          await db
            .update(workflowsTable)
            .set({
              lastRun: completedAt,
              lastRunStatus: 'error',
              lastRunError: error instanceof Error ? error.message : 'Unknown error',
              runCount: sql`${workflowsTable.runCount} + 1`,
            })
            .where(eq(workflowsTable.id, workflowId));

          onProgress?.({
            type: 'workflow_failed',
            runId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    }

    // Update workflow run with success
    const completedAt = new Date();
    const totalDuration = completedAt.getTime() - startedAt.getTime();

    // Calculate final output BEFORE saving to database
    // Return final output - use returnValue if specified, otherwise auto-detect
    let finalOutput: unknown = context.variables;
    if (config.returnValue) {
      finalOutput = resolveValue(config.returnValue, context.variables);
    } else {
      // Auto-detect: Filter out internal variables and return only step outputs
      // Internal variables: user, trigger, credentials (youtube_apikey, openai, etc.)
      const internalKeys = ['user', 'trigger'];
      const filteredVars: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(context.variables as Record<string, unknown>)) {
        // Skip internal variables
        if (internalKeys.includes(key)) continue;
        // Skip credential variables (they're from user credentials table)
        if (key.includes('_apikey') || key.includes('_api_key')) continue;
        // Skip if it's a known credential platform
        if (['openai', 'anthropic', 'youtube', 'slack', 'twitter', 'github', 'reddit'].includes(key)) continue;

        filteredVars[key] = value;
      }

      // If we have filtered variables, use them; otherwise return all (backward compat)
      if (Object.keys(filteredVars).length > 0) {
        finalOutput = filteredVars;
      }
    }

    // Save filtered output to database
    await db
      .update(workflowRunsTable)
      .set({
        status: 'success',
        completedAt,
        duration: totalDuration,
        output: finalOutput ? JSON.stringify(finalOutput) : null,
      })
      .where(eq(workflowRunsTable.id, runId));

    await db
      .update(workflowsTable)
      .set({
        lastRun: completedAt,
        lastRunStatus: 'success',
        lastRunError: null,
        runCount: sql`${workflowsTable.runCount} + 1`,
      })
      .where(eq(workflowsTable.id, workflowId));

    logger.info({ workflowId, runId, duration: totalDuration }, 'Workflow execution completed');

    onProgress?.({
      type: 'workflow_completed',
      runId,
      duration: totalDuration,
      output: finalOutput,
    });

    return { success: true, output: finalOutput };
  } catch (error) {
    logger.error({ error, workflowId, userId }, 'Workflow execution failed');

    // Update workflow run with error if it exists
    try {
      const completedAt = new Date();
      await db
        .update(workflowRunsTable)
        .set({
          status: 'error',
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(workflowRunsTable.id, runId));
    } catch (updateError) {
      logger.error({ updateError }, 'Failed to update workflow run status');
    }

    // Emit workflow failed event
    onProgress?.({
      type: 'workflow_failed',
      runId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper functions (copied from executor.ts to avoid circular dependency)

function resolveVariables(
  inputs: Record<string, unknown>,
  variables: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    resolved[key] = resolveValue(value, variables);
  }

  return resolved;
}

function resolveValue(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    const match = value.match(/^{{(.+)}}$/);
    if (match) {
      const path = match[1];
      return getNestedValue(variables, path);
    }

    return value.replace(/{{(.+?)}}/g, (_, path) => {
      const resolved = getNestedValue(variables, path);
      return String(resolved ?? '');
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, variables));
  }

  if (value && typeof value === 'object') {
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      resolved[k] = resolveValue(v, variables);
    }
    return resolved;
  }

  return value;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(/\.|\[|\]/).filter(Boolean);
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return current;
}

const CATEGORY_FOLDER_MAP: Record<string, string> = {
  'communication': 'communication',
  'social': 'social',
  'social media': 'social',
  'ai': 'ai',
  'data': 'data',
  'utilities': 'utilities',
  'payments': 'payments',
  'productivity': 'productivity',
  'business': 'business',
  'content': 'content',
  'dataprocessing': 'dataprocessing',
  'data processing': 'dataprocessing',
  'devtools': 'devtools',
  'developer tools': 'devtools',
  'dev tools': 'devtools',
  'e-commerce': 'ecommerce',
  'ecommerce': 'ecommerce',
  'lead generation': 'leads',
  'leads': 'leads',
  'video automation': 'video',
  'video': 'video',
  'external apis': 'external-apis',
  'external-apis': 'external-apis',
};

async function executeModuleFunction(
  modulePath: string,
  inputs: Record<string, unknown>
): Promise<unknown> {
  logger.info({ modulePath, inputs }, 'Executing module function');

  const parts = modulePath.split('.');

  let categoryName: string | undefined;
  let moduleName: string | undefined;
  let functionName: string | undefined;

  if (parts.length >= 3) {
    if (parts.length >= 4) {
      const twoWordCategory = `${parts[0]} ${parts[1]}`.toLowerCase();
      if (CATEGORY_FOLDER_MAP[twoWordCategory]) {
        categoryName = CATEGORY_FOLDER_MAP[twoWordCategory];
        moduleName = parts[2];
        functionName = parts[3];
      }
    }

    if (!categoryName) {
      const oneWordCategory = parts[0].toLowerCase();
      if (CATEGORY_FOLDER_MAP[oneWordCategory]) {
        categoryName = CATEGORY_FOLDER_MAP[oneWordCategory];
        moduleName = parts[1];
        functionName = parts[2];
      }
    }
  }

  if (!categoryName || !moduleName || !functionName) {
    throw new Error(`Invalid module path: ${modulePath}. Expected format: category.module.function`);
  }

  try {
    const moduleFile = await import(`@/modules/${categoryName}/${moduleName}`);

    if (!moduleFile[functionName]) {
      throw new Error(`Function ${functionName} not found in module ${categoryName}/${moduleName}`);
    }

    const func = moduleFile[functionName];

    if (modulePath.includes('youtube') || modulePath.includes('searchVideos')) {
      logger.info({
        modulePath,
        functionName,
        inputKeys: Object.keys(inputs),
        hasApiKey: 'apiKey' in inputs,
        apiKeyValue: inputs.apiKey ? `${String(inputs.apiKey).substring(0, 10)}...` : 'MISSING'
      }, 'Executing YouTube function with inputs');
    }

    const func_str = func.toString();
    const paramMatch = func_str.match(/\(([^)]*)\)/);
    const params = paramMatch?.[1]?.trim() || '';

    const hasObjectParam = params.startsWith('{') || (params.includes(':') && !params.includes(','));

    const inputKeys = Object.keys(inputs);

    if (inputKeys.length === 0) {
      return await func();
    } else if (inputKeys.length === 1 && !hasObjectParam) {
      return await func(Object.values(inputs)[0]);
    } else if (hasObjectParam) {
      return await func(inputs);
    } else {
      const paramNames = params
        .split(',')
        .map((p: string) => {
          return p.split(':')[0].split('=')[0].trim().replace(/[{}]/g, '');
        })
        .filter(Boolean);

      logger.debug({
        functionParams: paramNames,
        inputKeys: Object.keys(inputs),
        msg: 'Parameter mapping analysis'
      });

      const paramAliases: Record<string, string[]> = {
        'days': ['amount', 'value', 'number'],
        'hours': ['amount', 'value', 'number'],
        'minutes': ['amount', 'value', 'number'],
        'limit': ['maxResults', 'max', 'count'],
        'query': ['search', 'q', 'term'],
        'text': ['message', 'content', 'body'],
      };

      const orderedValues: unknown[] = [];
      const mappingLog: string[] = [];
      let hasAllParams = true;

      for (const paramName of paramNames) {
        let value: unknown = undefined;
        let matchedKey: string | undefined;

        if (paramName in inputs) {
          value = inputs[paramName];
          matchedKey = paramName;
        } else {
          const aliases = paramAliases[paramName] || [];
          for (const alias of aliases) {
            if (alias in inputs) {
              value = inputs[alias];
              matchedKey = alias;
              break;
            }
          }
        }

        if (matchedKey !== undefined) {
          orderedValues.push(value);
          mappingLog.push(`${paramName}=${JSON.stringify(value)} (from ${matchedKey})`);
        } else {
          hasAllParams = false;
          break;
        }
      }

      if (hasAllParams && orderedValues.length === paramNames.length) {
        logger.debug({
          msg: 'Mapped parameters to function signature order (with aliases)',
          mapping: mappingLog
        });
        return await func(...orderedValues);
      }

      // Allow partial parameter matching for optional parameters
      if (orderedValues.length > 0 && orderedValues.length <= paramNames.length) {
        logger.debug({
          msg: 'Calling function with partial parameters (remaining are optional)',
          providedParams: orderedValues.length,
          totalParams: paramNames.length,
          mapping: mappingLog
        });
        return await func(...orderedValues);
      }

      if (inputKeys.length === paramNames.length) {
        const positionalValues = Object.values(inputs);
        logger.warn({
          msg: 'Using positional parameter matching (input names do not match function signature)',
          expectedParams: paramNames,
          providedInputs: Object.keys(inputs),
          modulePath
        });
        return await func(...positionalValues);
      }

      // Allow positional matching even if fewer inputs than params (for optional parameters)
      if (inputKeys.length > 0 && inputKeys.length <= paramNames.length) {
        const positionalValues = Object.values(inputs);
        logger.warn({
          msg: 'Using positional parameter matching with partial parameters',
          expectedParams: paramNames,
          providedInputs: Object.keys(inputs),
          modulePath
        });
        return await func(...positionalValues);
      }

      const errorMsg = `Parameter mismatch for ${modulePath}: Function expects [${paramNames.join(', ')}] but workflow provided [${Object.keys(inputs).join(', ')}]`;
      logger.error({
        modulePath,
        expectedParams: paramNames,
        providedInputs: Object.keys(inputs),
        msg: errorMsg
      });
      throw new Error(errorMsg);
    }
  } catch (error) {
    logger.error({
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        cause: error.cause
      } : error,
      modulePath,
      inputs,
      msg: 'Module function execution failed'
    });
    throw new Error(
      `Failed to execute ${modulePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function loadUserCredentials(userId: string): Promise<Record<string, string>> {
  try {
    const credentialMap: Record<string, string> = {};

    // Load OAuth tokens with automatic token refresh for expired tokens
    const { getValidOAuthToken, supportsTokenRefresh } = await import('@/lib/oauth-token-manager');

    const accounts = await db
      .select()
      .from(accountsTable)
      .where(eq(accountsTable.userId, userId));

    for (const account of accounts) {
      if (account.access_token) {
        try {
          // Check if this provider supports automatic token refresh
          if (supportsTokenRefresh(account.provider)) {
            // Get valid token (auto-refreshes if expired)
            const validToken = await getValidOAuthToken(userId, account.provider);
            credentialMap[account.provider] = validToken;
            logger.info({ provider: account.provider }, 'Loaded OAuth token with auto-refresh support');
          } else {
            // Fallback to direct decryption for unsupported providers
            const { decrypt } = await import('@/lib/encryption');
            const decryptedToken = await decrypt(account.access_token);
            credentialMap[account.provider] = decryptedToken;
            logger.debug({ provider: account.provider }, 'Loaded OAuth token (no auto-refresh support)');
          }
        } catch (error) {
          logger.error({
            error,
            provider: account.provider,
            userId
          }, 'Failed to load OAuth token');
          // Don't throw - allow workflow to continue with other credentials
        }
      }
    }

    const credentials = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, userId));

    for (const cred of credentials) {
      if (cred.encryptedValue) {
        const { decrypt } = await import('@/lib/encryption');
        const decryptedValue = await decrypt(cred.encryptedValue);
        credentialMap[cred.platform] = decryptedValue;
      }
    }

    const platformAliases: Record<string, string[]> = {
      'youtube': ['youtube_apikey', 'youtube_api_key', 'youtube'],
      'twitter': ['twitter_oauth2', 'twitter_oauth', 'twitter'],
      'twitter-oauth': ['twitter_oauth2', 'twitter_oauth', 'twitter'], // Module name: social.twitter-oauth
      'github': ['github_oauth', 'github'],
      'google-sheets': ['googlesheets', 'googlesheets_oauth'],
      'googlesheets': ['googlesheets', 'googlesheets_oauth'],
      'google-calendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'googlecalendar': ['googlecalendar', 'googlecalendar_serviceaccount'],
      'notion': ['notion_oauth', 'notion'],
      'airtable': ['airtable_oauth', 'airtable'],
      'hubspot': ['hubspot_oauth', 'hubspot'],
      'salesforce': ['salesforce_jwt', 'salesforce'],
      'slack': ['slack_oauth', 'slack'],
      'discord': ['discord_oauth', 'discord'],
      'stripe': ['stripe_connect', 'stripe'],
      'rapidapi': ['rapidapi_api_key', 'rapidapi'],
      'openai': ['openai_api_key', 'openai'],
      'anthropic': ['anthropic_api_key', 'anthropic'],
    };

    for (const [platformName, credentialIds] of Object.entries(platformAliases)) {
      const existingCred = credentialIds.find(id => credentialMap[id]);

      if (existingCred) {
        for (const aliasName of [platformName, ...credentialIds]) {
          if (!credentialMap[aliasName]) {
            credentialMap[aliasName] = credentialMap[existingCred];
          }
        }
      }
    }

    logger.info(
      {
        userId,
        credentialCount: Object.keys(credentialMap).length,
        platforms: Object.keys(credentialMap),
        credentialDetails: Object.keys(credentialMap).map(key => ({
          platform: key,
          hasValue: !!credentialMap[key],
          valueLength: credentialMap[key]?.length || 0
        }))
      },
      'User credentials loaded (OAuth + API keys + aliases)'
    );

    return credentialMap;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to load user credentials');
    return {};
  }
}
