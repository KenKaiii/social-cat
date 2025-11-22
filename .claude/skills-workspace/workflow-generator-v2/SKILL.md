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
   - Manual (on-demand, click to run)
   - Webhook (HTTP endpoint, external trigger)
   - Cron (scheduled, time-based)
   - Chat (AI conversation)
   - Chat-Input (form with user input fields)
   - Telegram (bot messages)
   - Discord (bot messages)
   - Gmail (incoming emails)
   - Outlook (incoming emails)

2. **Output format**: How to display results?
   - JSON, Table, List, Text, Markdown, Image, Images, Chart

**Optional based on workflow type:**
- For webhooks: Need synchronous response? (Yes/No)
- For social media: Need deduplication? (Yes/No)
- For AI workflows: Which model? (GPT-4o-mini, Claude, etc.)

## Step 2: Load Context Files

**CRITICAL: Use Read tool to load these reference files in order:**

**1. Always read (required - load ALL of these):**
- `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/yaml-format.md`
  - Complete YAML structure specification
  - Variable interpolation rules
  - Output formats and returnValue
  - Auto-wrapping explanation

- `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/common-modules.md`
  - All 16 module categories
  - Module search instructions
  - Common module patterns

- `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/common-mistakes.md`
  - Top 10 mistakes and how to avoid them
  - Rest parameters issue
  - Variable naming errors
  - YAML syntax gotchas

**2. Read based on trigger type (required - load ONE):**
- **Manual** → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/manual-trigger.md`
- **Webhook** → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/webhook-trigger.md`
- **Cron** → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/cron-trigger.md`
- **Chat** → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/chat-trigger.md`
- **Chat-Input** → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/chat-input-trigger.md`
- **Gmail** → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/gmail-trigger.md`
- **Outlook** → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/outlook-trigger.md`
- **Telegram/Discord** → Same as manual trigger (no special config needed)

**Do NOT proceed without reading the core 3 files + your specific trigger file!**

**3. Optionally read module category references (as needed):**

Based on what modules the user needs, read relevant category references:
- AI/ML workflows → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/modules/ai-modules.md`
- Social media → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/modules/social-modules.md`
- Email/messaging → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/modules/communication-modules.md`
- CRM/invoicing → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/modules/business-modules.md`
- Databases/sheets → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/modules/data-modules.md`
- E-commerce → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/modules/ecommerce-modules.md`
- Other categories → `/Users/kenkai/Documents/b0t/.claude/skills/workflow-generator-v2/references/modules/other-categories.md`

These provide usage patterns, credential requirements, and examples for each category.

## Step 3: Search for Modules (MANDATORY - DO NOT SKIP)

**YOU MUST SEARCH FOR EVERY MODULE YOU PLAN TO USE. NEVER GUESS!**

For each functionality needed, run:
```bash
curl "http://localhost:3123/api/modules/search?q=&limit=5"<keyword>
```

**Example workflow needs:**
"Webhook that adds numbers and generates AI summary"

**YOU MUST RUN THESE SEARCHES:**
1. `curl "http://localhost:3123/api/modules/search?q=add&limit=5"` → Get exact path for addition
2. `curl "http://localhost:3123/api/modules/search?q=generate&limit=5"` → Get exact path for AI generation
3. `curl "http://localhost:3123/api/modules/search?q=execute&limit=5"` → Get exact path for JavaScript

**Extract from search results:**
- `path` - Use this EXACTLY in your YAML (e.g., `utilities.array-utils.sum`)
- `signature` - Shows parameter names (e.g., `sum(arr)` means use `arr:`, not `array:` or `numbers:`)
- `wrapper` - If "options" or "params", inputs are auto-wrapped
- `params` - Shows which are required vs optional

**CONSEQUENCES OF NOT SEARCHING:**
- ❌ Wrong module paths → Build fails
- ❌ Wrong parameter names → Build fails
- ❌ Missing required params → Build fails
- ❌ Using rest parameter modules → Runtime fails

**NO EXCEPTIONS - SEARCH FOR EVERYTHING!**

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
curl -X POST http://localhost:3123/api/workflows/build-from-plan -H "Content-Type: application/json" -d '{"planPath": "plans/{workflow-name}.yaml"}'
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
