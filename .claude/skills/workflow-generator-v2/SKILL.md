---
name: workflow-generator-v2
description: "Modular workflow generator with on-demand context loading. Creates workflows from YAML plans with focused, trigger-specific guidance. Use when user wants to create, build, or generate workflow automation."
---

# Workflow Generator V2 (Modular)

Generate reliable workflows using progressive context disclosure - load only what's needed for the specific workflow type.

## Process Overview

```
1. Ask user questions → Get trigger type + requirements
2. Load ONLY relevant reference docs for that trigger
3. Build YAML plan with focused context
4. Validate and import workflow
```

## Step 1: Ask Clarifying Questions

Use AskUserQuestion tool to gather:

**Required questions:**
1. **Trigger type**: When should workflow run?
   - Manual (on-demand)
   - Webhook (HTTP endpoint)
   - Cron (scheduled)
   - Chat (AI conversation)
   - Telegram/Discord (bot messages)

2. **Output format**: How to display results?
   - JSON, Table, Text, Markdown, etc.

**Optional based on workflow type:**
- For webhooks: Need synchronous response? (Yes/No)
- For social media: Need deduplication? (Yes/No)
- For AI workflows: Which model? (GPT-4o-mini, Claude, etc.)

## Step 2: Load Context Files

**CRITICAL: Use Read tool to load these reference files:**

**Always read (required):**
1. `.claude/skills/workflow-generator-v2/references/common-modules.md`
   - Module categories and search instructions
   - Common patterns for JavaScript, AI, arrays, etc.

**Read based on trigger type (required):**
2. Based on user's trigger choice:
   - **Webhook** → `.claude/skills/workflow-generator-v2/references/webhook-trigger.md`
   - **Chat** → `.claude/skills/workflow-generator-v2/references/chat-trigger.md`
   - **Cron** → `.claude/skills/workflow-generator-v2/references/cron-trigger.md`
   - **Manual** → `.claude/skills/workflow-generator-v2/references/manual-trigger.md`

These files contain:
- Available trigger variables (webhook: trigger.body, chat: trigger.message, etc.)
- Trigger configuration options
- Complete working examples
- Critical rules and patterns

**Do NOT proceed without reading BOTH files!**

## Step 3: Search for Modules (If Needed)

If user needs specific functionality (math, AI, social media), search for modules:

```bash
npm run modules:search <keyword>
```

Common categories:
- `utilities.javascript` - Custom code execution
- `utilities.math` - Mathematical operations
- `utilities.array-utils` - Array operations
- `ai.ai-sdk` - AI text generation
- `social.*` - Social media actions

## Step 4: Build YAML Plan

Create `plans/{workflow-name}.yaml` using:
- The trigger context from the reference file you read
- Module search results
- User's specific requirements

**YAML Structure:**
```yaml
name: Workflow Name
description: Brief description
trigger: webhook | cron | chat | manual | telegram | discord
# Trigger-specific config (from reference file):
webhookSync: true  # For webhooks
webhookSecret: "secret"  # Optional
output: json | table | text | markdown
returnValue: "{{variableName}}"  # Optional - what to return
steps:
  - module: category.module.function
    id: unique-id
    inputs:
      param: "{{variable}}"
    outputAs: variableName
```

## Step 5: Build Workflow

Run the build command:

```bash
npm run workflow:build plans/{workflow-name}.yaml
```

The build process:
- Auto-fixes common issues
- Validates all modules exist
- Validates parameters
- Runs dry-run test
- Imports to database automatically

## Step 6: Report Success

Tell user:
- Workflow name and ID
- How to access it
- How to test it (if webhook, provide curl command)

## Critical Rules

1. **ALWAYS read the trigger reference file** - Don't guess syntax
2. **Use exact variable names from reference** - e.g., `trigger.body`, not `webhookData`
3. **One example per trigger type** - Reference files have complete working examples
4. **Keep it simple** - Don't add unnecessary steps
5. **Test with dry-run** - Build script validates everything

## Error Handling

If build fails:
- Check error message
- Re-read reference file for correct syntax
- Fix YAML and rebuild
- Don't retry more than 2 times - ask user for clarification

**The key insight:** The LLM loads context on-demand by reading reference files, just like reading any other file in the codebase.
