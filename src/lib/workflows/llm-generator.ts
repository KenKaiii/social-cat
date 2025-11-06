import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { generateModuleDocs, validateModuleFunction } from './module-registry';

/**
 * LLM Workflow Generator
 *
 * Generates workflow configurations from natural language descriptions
 * Uses Claude or GPT-4 to understand user intent and create executable workflows
 */

// Configuration
const LLM_PROVIDER = (process.env.WORKFLOW_GENERATOR_PROVIDER || 'anthropic') as 'anthropic' | 'openai';
const LLM_MODEL = process.env.WORKFLOW_GENERATOR_MODEL ||
  (LLM_PROVIDER === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4-turbo');

// Workflow step schema
const workflowStepSchema = z.object({
  name: z.string().describe('Human-readable name for this step'),
  module: z.string().describe('Module path in format: category.module.function (e.g., ai.aiSdk.chat)'),
  params: z.record(z.any()).describe('Parameters for the module function'),
  outputAs: z.string().optional().describe('Variable name to store output for use in later steps'),
  condition: z.string().optional().describe('Conditional expression to determine if step should run'),
});

// Workflow config schema
const workflowConfigSchema = z.object({
  steps: z.array(workflowStepSchema),
  outputDisplay: z.object({
    type: z.enum(['table', 'list', 'text', 'markdown', 'json', 'image', 'images']),
    columns: z.array(z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['text', 'link', 'date', 'number', 'boolean']),
    })).optional(),
  }).optional().describe('How to display the workflow output'),
});

// Workflow schema
const workflowSchema = z.object({
  name: z.string().describe('Short, descriptive name for the workflow'),
  description: z.string().describe('What this workflow does'),
  trigger: z.object({
    type: z.enum(['manual', 'cron', 'webhook', 'chat']),
    schedule: z.string().optional().describe('Cron schedule if type is cron'),
    webhookPath: z.string().optional().describe('Webhook path if type is webhook'),
  }),
  config: workflowConfigSchema,
  requiredCredentials: z.array(z.string()).describe('List of credential types needed (e.g., openai, slack, twitter)'),
});

export type GeneratedWorkflow = z.infer<typeof workflowSchema>;

/**
 * Generate a workflow from natural language description
 */
export async function generateWorkflowFromPrompt(
  userPrompt: string,
  options: {
    userId?: string;
    context?: string;
  } = {}
): Promise<GeneratedWorkflow> {
  logger.info({ userPrompt, provider: LLM_PROVIDER, model: LLM_MODEL }, 'Generating workflow from prompt');

  try {
    // Get module registry
    const moduleRegistry = generateModuleDocs();

    // Build system prompt
    const systemPrompt = `You are an expert workflow automation specialist. Your job is to generate executable workflow configurations from natural language descriptions.

${moduleRegistry}

## Important Rules:

1. **Module Paths**: Use the exact format \`category.module.function\` from the available modules above
2. **Variable References**: Use \`{{variableName}}\` to reference previous step outputs
3. **Nested Access**: Use dot notation and array indexing: \`{{feed.items[0].title}}\`
4. **Output Storage**: Use \`outputAs\` to store results for later steps
5. **Credentials**: List all credential types needed (e.g., openai, slack, gohighlevel)
6. **AI Prompts**: For AI modules, be specific with systemPrompt and userPrompt
7. **Display Config**: Specify outputDisplay if user wants specific columns or formatting

## Workflow Design Patterns:

**Pattern 1: Data Fetch → Process → Notify**
\`\`\`
1. Fetch data (API call or database query)
2. Process/transform data (filter, map, AI analysis)
3. Send notification (Slack, email, etc.)
\`\`\`

**Pattern 2: Multi-Step AI Pipeline**
\`\`\`
1. Get input data (transcript, document, etc.)
2. AI Step 1: Extract information
3. AI Step 2: Generate report from extraction
4. AI Step 3: QA check
5. AI Step 4: Apply fixes if needed
6. Save/send results
\`\`\`

**Pattern 3: Webhook → Process → Update CRM**
\`\`\`
1. Receive webhook data
2. Process data (parse, validate, enrich)
3. Update CRM (create/update record)
4. Notify team
\`\`\`

## Output Display Guidelines:

- Use \`table\` for structured data with multiple fields
- Use \`list\` for simple arrays of items
- Use \`markdown\` for formatted text reports
- Use \`json\` for raw API responses
- Specify columns for tables: key, label, type

${options.context ? `\n## Additional Context:\n${options.context}\n` : ''}

Generate a complete, executable workflow that follows these patterns and uses the available modules correctly.`;

    // Get AI model
    const model = LLM_PROVIDER === 'anthropic'
      ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(LLM_MODEL)
      : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(LLM_MODEL);

    // Generate workflow using structured output
    const result = await generateObject({
      model,
      schema: workflowSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3, // Lower temperature for more consistent output
    });

    logger.info(
      {
        workflow: result.object,
        usage: result.usage,
        finishReason: result.finishReason,
      },
      'Workflow generated successfully'
    );

    return result.object;
  } catch (error) {
    logger.error({ error, userPrompt }, 'Failed to generate workflow');
    throw new Error(
      `Failed to generate workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Refine an existing workflow based on user feedback
 */
export async function refineWorkflow(
  existingWorkflow: GeneratedWorkflow,
  feedback: string
): Promise<GeneratedWorkflow> {
  logger.info({ workflowName: existingWorkflow.name, feedback }, 'Refining workflow');

  const prompt = `Here is an existing workflow:

${JSON.stringify(existingWorkflow, null, 2)}

User feedback: "${feedback}"

Please update the workflow based on this feedback. Keep the same structure but make the requested changes.`;

  return generateWorkflowFromPrompt(prompt, {
    context: 'This is a refinement of an existing workflow.',
  });
}

/**
 * Validate that a workflow uses only available modules
 */
export function validateWorkflow(workflow: GeneratedWorkflow): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check each step
  for (const step of workflow.config.steps) {
    // Validate module function exists
    if (!validateModuleFunction(step.module)) {
      errors.push(`Step "${step.name}": Invalid or unknown module: ${step.module}`);
      continue;
    }

    // Check for variable references in params
    const paramString = JSON.stringify(step.params);
    const variableRefs = paramString.match(/\{\{([^}]+)\}\}/g) || [];

    for (const ref of variableRefs) {
      const varName = ref.replace(/\{\{|\}\}/g, '').split('.')[0].split('[')[0];

      // Check if variable was defined in a previous step
      const definedBefore = workflow.config.steps
        .slice(0, workflow.config.steps.indexOf(step))
        .some(s => s.outputAs === varName);

      if (!definedBefore && varName !== 'input') {
        warnings.push(
          `Step "${step.name}": Variable {{${varName}}} may not be defined yet`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Explain what a workflow does in plain English
 */
export async function explainWorkflow(workflow: GeneratedWorkflow): Promise<string> {
  const model = LLM_PROVIDER === 'anthropic'
    ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(LLM_MODEL)
    : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(LLM_MODEL);

  const prompt = `Explain this workflow in plain English for a non-technical user:

${JSON.stringify(workflow, null, 2)}

Keep it concise (2-3 sentences) and focus on what the workflow does, not how it works technically.`;

  const { text } = await model.doGenerate({
    inputFormat: 'prompt',
    mode: { type: 'regular' },
    prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  });

  return text;
}
