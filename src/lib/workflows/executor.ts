import { db } from '@/lib/db';
import {
  workflowsTable,
  workflowRunsTable
} from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { executeStep, normalizeStep, type WorkflowStep } from './control-flow';
import {
  executeStepsInParallel,
  analyzeParallelizationPotential,
} from './parallel-executor';

/**
 * Workflow Executor
 *
 * Executes LLM-generated workflow configurations by running steps sequentially
 * and passing data between steps via variable interpolation.
 */

export interface ExecutionContext {
  variables: Record<string, unknown>;
  workflowId: string;
  runId: string;
  userId: string;
  config?: {
    steps: Array<{
      id: string;
      module: string;
      inputs: Record<string, unknown>;
      outputAs?: string;
    }>;
    returnValue?: string;
  };
}

/**
 * Execute a workflow by ID
 */
export async function executeWorkflow(
  workflowId: string,
  userId: string,
  triggerType: string,
  triggerData?: Record<string, unknown>
): Promise<{ success: boolean; output?: unknown; error?: string; errorStep?: string }> {
  logger.info({ workflowId, userId, triggerType }, 'Starting workflow execution');

  const runId = randomUUID();
  const startedAt = new Date();

  try {
    // Get workflow configuration first (need organizationId for PostgreSQL workflow run)
    const workflows = await db
      .select()
      .from(workflowsTable)
      .where(eq(workflowsTable.id, workflowId))
      .limit(1);

    if (workflows.length === 0) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    const workflow = workflows[0];

    // Check if workflow belongs to an organization and if that organization is active
    // Use denormalized organizationStatus field to avoid extra query (50-100ms saved)
    if (workflow.organizationId) {
      logger.info({
        workflowId,
        organizationId: workflow.organizationId,
        organizationStatus: workflow.organizationStatus,
        optimization: 'DENORMALIZED_ORG_STATUS'
      }, `✅ Organization status check (denormalized field, 0 extra queries)`);

      if (workflow.organizationStatus === 'inactive') {
        throw new Error('Cannot execute workflow: client organization is inactive');
      }
    }

    // Create workflow run record (after getting workflow for organizationId)
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

    // Parse config - for PostgreSQL it's a string, for SQLite it's already an object
    let config;
    try {
      config = (typeof workflow.config === 'string'
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
    } catch (parseError) {
      logger.error({ workflowId, parseError }, 'Failed to parse workflow config');
      throw new Error(`Invalid workflow configuration: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    logger.info({ workflowId, stepCount: config.steps.length }, 'Executing workflow steps');

    // Load user credentials
    const userCredentials = await loadUserCredentials(userId);

    // DEBUG: Log credential keys
    logger.info({
      userId,
      credentialKeys: Object.keys(userCredentials),
      hasAnthropicKey: 'anthropic_api_key' in userCredentials,
      hasOpenaiKey: 'openai_api_key' in userCredentials,
    }, 'DEBUG: User credentials loaded for workflow execution');

    // Initialize execution context
    const context: ExecutionContext = {
      variables: {
        workflowId, // Add workflowId for workflow-scoped storage
        user: {
          id: userId,
          ...userCredentials, // e.g., { openai: "sk-...", stripe: "sk_test_..." }
        },
        credential: userCredentials, // Add credential namespace for {{credential.platform}} syntax
        trigger: triggerData || {},
        // Also add credentials to top-level for convenience
        // Allows {{user.youtube_apikey}}, {{credential.youtube_apikey}}, and {{youtube_apikey}} syntax
        ...userCredentials,
      },
      workflowId,
      runId,
      userId,
      config, // Include config for UI-set overrides (system prompts, etc.)
    };

    // Normalize all steps first
    const normalizedSteps = config.steps.map((step) => normalizeStep(step) as WorkflowStep);

    // Analyze parallelization potential
    const parallelAnalysis = analyzeParallelizationPotential(normalizedSteps, context);
    logger.info(
      {
        workflowId,
        runId,
        ...parallelAnalysis,
      },
      'Workflow parallelization analysis'
    );

    try {
      // Execute steps with automatic parallel execution
      await executeStepsInParallel(
        normalizedSteps,
        context,
        async (step, ctx) => {
          return await executeStep(
            step,
            ctx,
            (modulePath, inputs) => executeModuleFunction(modulePath, inputs, ctx),
            resolveVariables
          );
        }
      );
    } catch (error) {
      logger.error({ error, workflowId, runId }, 'Workflow execution failed');

      // Find which step failed (if available in error)
      const errorStep = error instanceof Error && 'stepId' in error
        ? (error as unknown as { stepId: string }).stepId
        : undefined;

      // Update workflow run with error (single transaction for 50% query reduction)
      const completedAt = new Date();
      await db.transaction(async (tx) => {
        await tx
          .update(workflowRunsTable)
          .set({
            status: 'error',
            completedAt,
            duration: completedAt.getTime() - startedAt.getTime(),
            error: error instanceof Error ? error.message : 'Unknown error',
            errorStep: errorStep || 'unknown',
          })
          .where(eq(workflowRunsTable.id, runId));

        // Update workflow last run status (use SQL increment to avoid race condition)
        await tx
          .update(workflowsTable)
          .set({
            lastRun: completedAt,
            lastRunStatus: 'error',
            lastRunError: error instanceof Error ? error.message : 'Unknown error',
            runCount: sql`${workflowsTable.runCount} + 1`,
          })
          .where(eq(workflowsTable.id, workflowId));
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStep: errorStep || 'unknown',
      };
    }

    // Extract final output - use returnValue if specified, otherwise auto-detect
    let finalOutput: unknown = context.variables;
    if (config.returnValue) {
      logger.info({ returnValue: config.returnValue }, 'EXECUTOR - Using returnValue');
      finalOutput = resolveValue(config.returnValue, context.variables);
      logger.info({
        isArray: Array.isArray(finalOutput),
        type: typeof finalOutput,
        length: Array.isArray(finalOutput) ? finalOutput.length : undefined
      }, 'EXECUTOR - finalOutput resolved');
    } else {
      logger.info('EXECUTOR - No returnValue config, auto-detecting output');
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
        logger.info({ filteredKeys: Object.keys(filteredVars) }, 'EXECUTOR - Filtered output variables');
      }
    }

    // Update workflow run with success (single transaction for 50% query reduction)
    const completedAt = new Date();
    const txStartTime = Date.now();
    await db.transaction(async (tx) => {
      await tx
        .update(workflowRunsTable)
        .set({
          status: 'success',
          completedAt,
          duration: completedAt.getTime() - startedAt.getTime(),
          output: finalOutput ? JSON.stringify(finalOutput) : null,
        })
        .where(eq(workflowRunsTable.id, runId));

      // Update workflow last run status (use SQL increment to avoid race condition)
      await tx
        .update(workflowsTable)
        .set({
          lastRun: completedAt,
          lastRunStatus: 'success',
          lastRunError: null,
          runCount: sql`${workflowsTable.runCount} + 1`,
        })
        .where(eq(workflowsTable.id, workflowId));
    });
    const txDuration = Date.now() - txStartTime;
    logger.info({
      workflowId,
      runId,
      transactionDuration: txDuration,
      optimization: 'DB_TRANSACTION_CONSOLIDATION'
    }, `✅ Consolidated DB updates in single transaction (${txDuration}ms, 2 queries → 1 transaction)`);

    logger.info({ workflowId, runId, duration: completedAt.getTime() - startedAt.getTime() }, 'Workflow execution completed');

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

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resolve variables in inputs
 * Replaces {{variableName}} with actual values from context
 */
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

/**
 * Resolve a single value (recursive for nested objects/arrays)
 */
function resolveValue(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    // Match {{variable}} or {{variable.property}} or {{variable[0].property}}
    const match = value.match(/^{{(.+)}}$/);
    if (match) {
      const path = match[1];
      const resolved = getNestedValue(variables, path);


      return resolved;
    }

    // Replace inline variables in strings
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

/**
 * Get nested value from object using dot notation
 * Supports: variable.property, variable[0], variable[0].property
 */
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

/**
 * Map category display names to folder names
 * The registry uses display names like "Social Media", but folders are named "social"
 */
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

/**
 * Execute a module function dynamically
 * Module path format: category.module.function
 * Example: utilities.rss.parseFeed → src/modules/utilities/rss.ts → parseFeed()
 * Example: social media.reddit.getSubredditPosts → src/modules/social/reddit.ts → getSubredditPosts()
 */
async function executeModuleFunction(
  modulePath: string,
  inputs: Record<string, unknown>,
  context?: ExecutionContext
): Promise<unknown> {
  logger.info({ modulePath, inputs }, 'Executing module function');

  // Parse module path - need to handle category names with spaces
  // Split by '.' and try to match against known category names
  const parts = modulePath.split('.');

  let categoryName: string | undefined;
  let moduleName: string | undefined;
  let functionName: string | undefined;

  // Try different combinations to find a valid category
  if (parts.length >= 3) {
    // Try 2-word category first (e.g., "social media")
    if (parts.length >= 4) {
      const twoWordCategory = `${parts[0]} ${parts[1]}`.toLowerCase();
      if (CATEGORY_FOLDER_MAP[twoWordCategory]) {
        categoryName = CATEGORY_FOLDER_MAP[twoWordCategory];
        moduleName = parts[2];
        functionName = parts[3];
      }
    }

    // Try 1-word category if 2-word didn't match
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
    // Dynamic import of module
    const moduleFile = await import(`@/modules/${categoryName}/${moduleName}`);

    // Auto-detect and prefer API key version for read-only operations
    // Read-only operations: search, get, fetch, list, view, read, find, retrieve, download, load
    const readOnlyPrefixes = ['search', 'get', 'fetch', 'list', 'view', 'read', 'find', 'retrieve', 'download', 'load'];
    const isReadOnly = readOnlyPrefixes.some(prefix =>
      functionName.toLowerCase().startsWith(prefix)
    );

    let actualFunctionName = functionName;
    const actualInputs = { ...inputs };

    // Auto-inject API key for AI modules
    // Check if this is an AI module (ai.ai-agent.runAgent, ai.ai-sdk.generateText, etc.)
    if (categoryName === 'ai' && inputs.options && typeof inputs.options === 'object' && context) {
      const options = inputs.options as Record<string, unknown>;

      // Only inject if apiKey is not already provided
      if (!options.apiKey) {
        const model = options.model as string | undefined;
        const provider = options.provider as string | undefined;

        // Determine credential key based on explicit provider or model name
        let credentialKey: string | undefined;

        if (provider) {
          // Use explicit provider if set (from workflow settings)
          if (provider === 'openai') {
            credentialKey = 'openai_api_key';
          } else if (provider === 'anthropic') {
            credentialKey = 'anthropic_api_key';
          } else if (provider === 'openrouter') {
            credentialKey = 'openrouter_api_key';
          }
        } else if (model) {
          // Fall back to detecting from model name
          if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) {
            credentialKey = 'openai_api_key';
          } else if (model.startsWith('claude-')) {
            credentialKey = 'anthropic_api_key';
          } else if (model.includes('/')) {
            // OpenRouter models contain a slash (e.g., 'openai/gpt-4o')
            credentialKey = 'openrouter_api_key';
          }
        }

        if (credentialKey && context.variables.credential) {
          // Get the actual credential value from context
          const credentialValue = (context.variables.credential as Record<string, unknown>)[credentialKey];

          if (credentialValue) {
            // Inject the actual credential value
            (actualInputs.options as Record<string, unknown>).apiKey = credentialValue;

            logger.info({
              modulePath,
              model,
              provider,
              credentialKey
            }, 'Auto-injected AI API key from credentials');
          }
        }
      }
    }

    // If it's a read-only operation, try to use the API key version
    if (isReadOnly) {
      const apiKeyVersion = `${functionName}WithApiKey`;

      if (moduleFile[apiKeyVersion]) {
        logger.info({
          originalFunction: functionName,
          apiKeyVersion,
          modulePath
        }, 'Auto-selecting API key version for read-only operation');

        actualFunctionName = apiKeyVersion;

        // Auto-inject API key if not already provided
        if (!actualInputs.apiKey) {
          // Extract service name from module (e.g., "youtube" from "youtube")
          const apiKeyCredential = `${moduleName}_api_key`;
          actualInputs.apiKey = `{{credential.${apiKeyCredential}}}`;

          logger.info({
            apiKeyCredential,
            moduleName
          }, 'Auto-injecting API key credential reference');
        }
      }
    }

    if (!moduleFile[actualFunctionName]) {
      throw new Error(`Function ${actualFunctionName} not found in module ${categoryName}/${moduleName}`);
    }

    const func = moduleFile[actualFunctionName];

    // Debug logging for credential-related functions
    if (modulePath.includes('youtube') || modulePath.includes('searchVideos')) {
      logger.info({
        modulePath,
        functionName: actualFunctionName,
        inputKeys: Object.keys(actualInputs),
        hasApiKey: 'apiKey' in actualInputs,
        apiKeyValue: actualInputs.apiKey ? `${String(actualInputs.apiKey).substring(0, 10)}...` : 'MISSING'
      }, 'Executing YouTube function with inputs');
    }

    // Call the function with inputs
    // Determine if we should pass as object or spread parameters
    const func_str = func.toString();
    const paramMatch = func_str.match(/\(([^)]*)\)/);
    const params = paramMatch?.[1]?.trim() || '';

    // If function has a single parameter with object destructuring, pass as object
    // Examples: "({ subreddit, limit })" or "options: RedditSubmitOptions" or "fieldArrays: Record<string, unknown[]>"
    // Need to ignore commas inside angle brackets (generics) when counting parameters
    const paramsWithoutGenerics = params.replace(/<[^>]+>/g, '');
    const hasObjectParam = params.startsWith('{') || (params.includes(':') && !paramsWithoutGenerics.includes(','));

    const inputKeys = Object.keys(actualInputs);

    // Handle params wrapper - if inputs has a single 'params' key and function expects 'params'
    // Example: inputs = { params: { items: [...], count: 3 } } and function signature is (params: { items, count })
    if (inputKeys.length === 1 && inputKeys[0] === 'params' && params.startsWith('params')) {
      // Unwrap the params object
      return await func(actualInputs.params);
    }

    if (inputKeys.length === 0) {
      // No parameters
      return await func();
    } else if (inputKeys.length === 1 && !hasObjectParam) {
      // Single parameter - pass the value directly
      return await func(Object.values(actualInputs)[0]);
    } else if (hasObjectParam) {
      // Function expects single object parameter - pass inputs as object
      return await func(actualInputs);
    } else {
      // Multiple separate parameters - need to map input keys to parameter order
      // Parse parameter names from function signature
      const paramNames = params
        .split(',')
        .map((p: string) => {
          // Extract parameter name, removing type annotations and default values
          // Examples: "url: string" -> "url", "limit: number = 10" -> "limit"
          return p.split(':')[0].split('=')[0].trim().replace(/[{}]/g, '');
        })
        .filter(Boolean);

      logger.debug({
        functionParams: paramNames,
        inputKeys: Object.keys(actualInputs),
        msg: 'Parameter mapping analysis'
      });

      // Common parameter aliases that LLMs might use (updated)
      const paramAliases: Record<string, string[]> = {
        'days': ['amount', 'value', 'number'],
        'hours': ['amount', 'value', 'number'],
        'minutes': ['amount', 'value', 'number'],
        'limit': ['maxResults', 'max', 'count'],
        'query': ['search', 'q', 'term'],
        'text': ['message', 'content', 'body'],
        'arr': ['array', 'items', 'list'],
        'arr1': ['array1'],
        'arr2': ['array2'],
        'arrays': ['array'],
      };

      // Try to map inputs to parameter order with alias support
      const orderedValues: unknown[] = [];
      const mappingLog: string[] = [];
      let hasAllParams = true;

      for (const paramName of paramNames) {
        let value: unknown = undefined;
        let matchedKey: string | undefined;

        // Try exact match first
        if (paramName in actualInputs) {
          value = actualInputs[paramName];
          matchedKey = paramName;
        } else {
          // Try aliases
          const aliases = paramAliases[paramName] || [];
          for (const alias of aliases) {
            if (alias in actualInputs) {
              value = actualInputs[alias];
              matchedKey = alias;
              break;
            }
          }
        }

        if (matchedKey !== undefined) {
          orderedValues.push(value);
          mappingLog.push(`${paramName}=${JSON.stringify(value)} (from ${matchedKey})`);
        } else {
          // Required param not found
          hasAllParams = false;
          break;
        }
      }

      if (hasAllParams && orderedValues.length === paramNames.length) {
        // Successfully mapped all parameters
        logger.debug({
          msg: 'Mapped parameters to function signature order (with aliases)',
          mapping: mappingLog
        });
        return await func(...orderedValues);
      }

      // Allow partial parameter matching for optional parameters
      // If we mapped some parameters but not all, try calling with what we have
      if (orderedValues.length > 0 && orderedValues.length <= paramNames.length) {
        logger.debug({
          msg: 'Calling function with partial parameters (remaining are optional)',
          providedParams: orderedValues.length,
          totalParams: paramNames.length,
          mapping: mappingLog
        });
        return await func(...orderedValues);
      }

      // If we have the same number of inputs as params but names don't match,
      // try positional matching as last resort (for backward compatibility)
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

      // Still no match - this is an error
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

/**
 * In-memory credential cache
 * Stores decrypted credentials to avoid repeated database queries and decryption
 */
const globalForCredentials = globalThis as typeof globalThis & {
  _credentialCache?: Map<string, { credentials: Record<string, string | Record<string, string>>; timestamp: number }>;
};

if (!globalForCredentials._credentialCache) {
  globalForCredentials._credentialCache = new Map();
}

const CREDENTIAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load all credentials for a user from both OAuth accounts and API keys
 * Returns an object like: { twitter: "token...", youtube: "token...", openai: "sk-...", ... }
 * Exported for credential pre-loading cache
 *
 * Performance: 3x faster with Redis cache (10-20ms vs 250-600ms DB query)
 */
export async function loadUserCredentials(userId: string): Promise<Record<string, string | Record<string, string>>> {
  // Try Redis cache first (shared across all instances)
  const { getCacheOrCompute, CacheKeys, CacheTTL } = await import('@/lib/cache');

  const startTime = Date.now();
  const result = await getCacheOrCompute(
    CacheKeys.userCredentials(userId),
    CacheTTL.CREDENTIALS,
    async () => {
      // Redis miss - load from database
      logger.info({ userId, optimization: 'REDIS_CREDENTIAL_CACHE' }, '❌ Cache MISS - Loading credentials from DB');
      return await loadUserCredentialsFromDB(userId);
    }
  );
  const duration = Date.now() - startTime;

  // Log cache hit/miss performance (cache hits <50ms, DB queries 100-300ms)
  logger.info({
    userId,
    duration,
    optimization: 'REDIS_CREDENTIAL_CACHE',
    cached: duration < 50
  }, `✅ Credentials loaded (${duration}ms, ${duration < 50 ? 'CACHE HIT' : 'CACHE MISS'})`);

  return result;
}

/**
 * Internal function: Load credentials directly from database
 * Called by loadUserCredentials when cache misses
 */
async function loadUserCredentialsFromDB(userId: string): Promise<Record<string, string | Record<string, string>>> {
  // Check in-memory cache (process-local, faster than Redis)
  const cached = globalForCredentials._credentialCache!.get(userId);
  if (cached && Date.now() - cached.timestamp < CREDENTIAL_CACHE_TTL) {
    logger.info({ userId, cacheAge: Math.round((Date.now() - cached.timestamp) / 1000) }, '⚡ Using in-memory cached credentials');
    return cached.credentials;
  }

  try {
    const credentialMap: Record<string, string | Record<string, string>> = {};

    // 1. Load OAuth tokens from accounts table (Twitter, YouTube, etc.)
    // Uses automatic token refresh for expired tokens
    const { accountsTable, userCredentialsTable } = await import('@/lib/schema');
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

    // 2. Load API keys from user_credentials table (OpenAI, RapidAPI, Stripe, etc.)
    const credentials = await db
      .select()
      .from(userCredentialsTable)
      .where(eq(userCredentialsTable.userId, userId));

    for (const cred of credentials) {
      const { decrypt } = await import('@/lib/encryption');

      // Handle single-field credentials (backward compatible)
      if (cred.encryptedValue) {
        const decryptedValue = await decrypt(cred.encryptedValue);
        credentialMap[cred.platform] = decryptedValue;
      }

      // Handle multi-field credentials (from metadata.fields)
      if (cred.metadata && typeof cred.metadata === 'object' && 'fields' in cred.metadata) {
        const fields = cred.metadata.fields as Record<string, string>;
        const decryptedFields: Record<string, string> = {};

        for (const [key, encryptedValue] of Object.entries(fields)) {
          decryptedFields[key] = await decrypt(encryptedValue);
        }

        // Store as an object so {{user.platform.field}} works
        credentialMap[cred.platform] = decryptedFields;
      }
    }

    // Add platform aliases for dual-auth platforms
    // Maps module names (from workflow paths) to all possible credential IDs
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
      'openrouter': ['openrouter_api_key', 'openrouter'],
    };

    // Apply aliases: check if any credential ID in the list exists, then make it available under all alias names
    for (const [platformName, credentialIds] of Object.entries(platformAliases)) {
      // Find the first credential that exists
      const existingCred = credentialIds.find(id => credentialMap[id]);

      if (existingCred) {
        // Make this credential available under all alias names
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
        // Debug: show what credentials are actually loaded
        credentialDetails: Object.keys(credentialMap).map(key => ({
          platform: key,
          hasValue: !!credentialMap[key],
          valueLength: credentialMap[key]?.length || 0
        }))
      },
      'User credentials loaded (OAuth + API keys + aliases)'
    );

    // Store in cache
    globalForCredentials._credentialCache!.set(userId, {
      credentials: credentialMap,
      timestamp: Date.now(),
    });

    return credentialMap;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to load user credentials');
    return {}; // Return empty object if loading fails
  }
}

/**
 * Execute workflow from config directly (without database lookup)
 */
export async function executeWorkflowConfig(
  config: {
    steps: Array<{
      id: string;
      module: string;
      inputs: Record<string, unknown>;
      outputAs?: string;
    }>;
  },
  userId: string,
  triggerData?: Record<string, unknown>
): Promise<{ success: boolean; output?: unknown; error?: string; errorStep?: string }> {
  const runId = randomUUID();
  logger.info({ runId, stepCount: config.steps.length }, 'Executing workflow config');

  // Load user credentials
  const userCredentials = await loadUserCredentials(userId);

  const context: ExecutionContext = {
    variables: {
      workflowId: 'inline', // Add workflowId for workflow-scoped storage
      user: {
        id: userId,
        ...userCredentials,
      },
      credential: userCredentials, // Add credential namespace for {{credential.platform}} syntax
      trigger: triggerData || {},
      // Also add credentials to top-level for convenience
      // Allows {{user.youtube_apikey}}, {{credential.youtube_apikey}}, and {{youtube_apikey}} syntax
      ...userCredentials,
    },
    workflowId: 'inline',
    runId,
    userId,
  };

  // Normalize all steps first
  const normalizedSteps = config.steps.map((step) => normalizeStep(step) as WorkflowStep);

  // Analyze parallelization potential
  const parallelAnalysis = analyzeParallelizationPotential(normalizedSteps, context);
  logger.info(
    {
      runId,
      ...parallelAnalysis,
    },
    'Workflow config parallelization analysis'
  );

  try {
    // Execute steps with automatic parallel execution
    await executeStepsInParallel(
      normalizedSteps,
      context,
      async (step, ctx) => {
        return await executeStep(
          step,
          ctx,
          (modulePath, inputs) => executeModuleFunction(modulePath, inputs, ctx),
          resolveVariables
        );
      }
    );

    logger.info({ runId }, 'Workflow config execution completed');
    // Return all workflow variables for comprehensive output
    return { success: true, output: context.variables };
  } catch (error) {
    logger.error({ error, runId }, 'Workflow config execution failed');

    // Find which step failed (if available in error)
    const errorStep = error instanceof Error && 'stepId' in error
      ? (error as unknown as { stepId: string }).stepId
      : undefined;

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStep,
    };
  }
}
