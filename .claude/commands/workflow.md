---
name: workflow
description: Generate and execute a custom workflow from natural language description
---

## ⚠️ CRITICAL - READ FIRST BEFORE DOING ANYTHING ⚠️

**BEFORE you search modules or write ANY code, answer these questions:**

1. **What trigger type did the user request?**
   - "chat", "chatbot", "agent" → `trigger.type = "chat"` + use `ai.ai-sdk.chat` module
   - "schedule", "daily", "cron" → `trigger.type = "cron"`
   - "webhook", "API" → `trigger.type = "webhook"`
   - No mention → `trigger.type = "manual"`

2. **Did you read the Chat Trigger Format section below?**
   - If trigger is "chat", scroll to line 86 and read the EXACT format required
   - Use `ai.ai-sdk.chat` NOT `generateText` for chat workflows

3. **Did you include the `trigger` field at TOP LEVEL?**
   - `trigger` is at the SAME LEVEL as `config`, NOT inside it

## Core Rules

1. **MATCH USER REQUEST EXACTLY** - Don't simplify or remove features
2. **DEBUG, DON'T SIMPLIFY** - Fix errors, never create "simpler versions"
3. **PARSE TRIGGER TYPE FIRST** - Read user request, identify trigger, THEN search modules

## Available Scripts

**Module Discovery:**
- `search-modules.ts "keyword"` - Find modules by keyword
- `search-modules.ts --category ai` - List modules in category
- `module-info.ts ai.ai-sdk.chat` - Detailed info on specific module

**Workflow Management:**
- `list-workflows.ts [--status active] [--trigger chat]` - List all workflows
- `export-workflow.ts <id> [file.json]` - Export to JSON file
- `update-workflow.ts <id> --trigger chat --status active` - Modify workflow
- `clone-workflow.ts <id> --name "New Name"` - Duplicate workflow

**Categories:** communication, social, data, ai, utilities, payments, productivity

## Workflow JSON Structure

**CRITICAL: `trigger` MUST be at TOP LEVEL, NOT inside `config`!**

```json
{
  "version": "1.0",
  "name": "Workflow Name",
  "description": "What it does",
  "trigger": {                          // ⚠️ TOP LEVEL - OUTSIDE config!
    "type": "manual" | "chat" | "webhook" | "cron" | "telegram" | "discord",
    "config": {
      // For chat: MUST include inputVariable
      "inputVariable": "userMessage",   // ⚠️ REQUIRED for chat triggers!
      "description": "User-facing description"
    }
  },
  "config": {                          // ⚠️ trigger is NOT here!
    "steps": [
      {
        "id": "step1",
        "module": "category.module.function",  // lowercase: ai.ai-sdk.chat
        "inputs": {
          // For chat workflows, use messages array format:
          "messages": [
            { "role": "system", "content": "System prompt" },
            { "role": "user", "content": "{{trigger.userMessage}}" }
          ]
        },
        "outputAs": "varName"  // optional
      }
    ],
    "outputDisplay": {  // optional - only if user requests specific format
      "type": "table" | "list" | "text" | "markdown" | "json",
      "columns": [{ "key": "field", "label": "Header", "type": "text" }]
    }
  },
  "metadata": {
    "author": "b0t AI",
    "tags": ["tag1"],
    "category": "utilities",
    "requiresCredentials": ["openai"]  // platforms needing API keys
  }
}
```

**Critical:**
- **`trigger` is TOP LEVEL** - Same level as `config`, NOT inside it!
- Module paths: `category.module.function` (all lowercase)
- Variable refs: `{{varName}}`, `{{data.items[0].title}}`
- `version` required (use "1.0")
- **`trigger` is REQUIRED** - Infer from user request:
  - "chat agent", "chatbot", "conversation" → `{ type: "chat", config: { inputVariable: "userMessage" } }`
  - "schedule", "daily", "every hour" → `{ type: "cron", config: { schedule: "0 9 * * *" } }`
  - "webhook", "API endpoint" → `{ type: "webhook", config: {} }`
  - "telegram bot" → `{ type: "telegram", config: { botToken: "", commands: ["/start"] } }`
  - "discord bot" → `{ type: "discord", config: { botToken: "", applicationId: "" } }`
  - Default (no trigger mentioned) → `{ type: "manual", config: {} }`

## Chat Trigger Format (IMPORTANT!)

For chat-based workflows, use this EXACT structure:

```json
{
  "trigger": {
    "type": "chat",
    "config": {
      "description": "What the chat does",
      "inputVariable": "userMessage"      // ⚠️ REQUIRED!
    }
  },
  "config": {
    "steps": [
      {
        "id": "chat-step",
        "module": "ai.ai-sdk.chat",
        "inputs": {
          "model": "gpt-4o-mini",
          "provider": "openai",
          "messages": [                   // ⚠️ Use messages array format
            {
              "role": "system",
              "content": "Your system prompt here"
            },
            {
              "role": "user",
              "content": "{{trigger.userMessage}}"  // ⚠️ Reference the inputVariable
            }
          ],
          "temperature": 0.7,
          "maxTokens": 500
        },
        "outputAs": "response"
      }
    ]
  }
}
```

**Chat Trigger Requirements:**
1. `trigger.type` = `"chat"` (top level!)
2. `trigger.config.inputVariable` = `"userMessage"` (or any name you choose)
3. Use `ai.ai-sdk.chat` module (NOT `generateText`)
4. Pass messages as array with system + user roles
5. Reference input via `{{trigger.userMessage}}` (or your chosen variable name)

## Workflow Creation Checklist (Follow in Order!)

**Step 0: Parse User Request**
- [ ] Identify trigger type from user's words ("chat", "schedule", "webhook", etc.)
- [ ] If "chat" trigger: Plan to use `ai.ai-sdk.chat` NOT `generateText`
- [ ] If "chat" trigger: Read lines 86-133 for EXACT format before continuing

**Step 1: Search Modules**
- [ ] `npx tsx scripts/search-modules.ts "keyword"`
- [ ] Verify module paths are lowercase: `ai.ai-sdk.chat`

**Step 2: Write JSON**
- [ ] Include `trigger` field at TOP LEVEL (same level as `config`)
- [ ] If chat: Include `trigger.config.inputVariable = "userMessage"`
- [ ] If chat: Use `ai.ai-sdk.chat` with messages array format
- [ ] Save to `/tmp/workflow.json` via bash `cat > /tmp/workflow.json << 'EOF'`

**Step 3: Validate**
- [ ] `npx tsx scripts/validate-workflow.ts /tmp/workflow.json`

**Step 4: Test**
- [ ] `npx tsx scripts/test-workflow.ts /tmp/workflow.json`

**Step 5: Import**
- [ ] `npx tsx scripts/import-workflow.ts /tmp/workflow.json`

## Error Handling

**Test script categorizes errors:**
- ✅ **You fix:** Wrong module path, bad variable refs, type errors
- ⚠️ **User fixes:** Missing API keys, network issues
- 🤝 **Both:** Rate limits, complex logic

**On error:**
1. Read error output carefully
2. Fix the EXACT issue (don't simplify!)
3. Re-test
4. If missing API keys, tell user: "Configure at http://localhost:3000/settings/credentials"

**Never:**
- "Let me create a simpler version"
- "Let's try with fewer steps"
- "Let's remove this feature"

## Key Modules

**Database:** `data.database.{query,insert,update,exists}`
**Dedup:** `utilities.deduplication.{filterProcessed,hasProcessed}`
**Scoring:** `utilities.scoring.{rankByWeightedScore,selectTop}`
**Arrays:** `utilities.array-utils.{pluck,sortBy,first,sum}`

## After Import

- View at: http://localhost:3000/dashboard/workflows
- Button label changes based on trigger: "Chat", "Run", "Webhook", etc.
- Configure via Settings dialog (cron, AI prompts, params)
- Manage API keys via Credentials button

## Workflow Management Scripts

**List workflows:**
```bash
list-workflows.ts                  # All workflows
list-workflows.ts --status active  # Filter by status
list-workflows.ts --trigger chat   # Filter by trigger
```

**Modify workflows:**
```bash
update-workflow.ts <id> --trigger chat --status active
clone-workflow.ts <id> --name "Version 2"
export-workflow.ts <id> backup.json
```
