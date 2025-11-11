---
name: workflow-builder
description: "YOU MUST USE THIS SKILL when the user wants to CREATE or BUILD a NEW workflow automation. Activate for requests like: 'create a workflow', 'build a workflow', 'generate a workflow', 'make a workflow', 'I want to automate', 'automate X to Y', 'schedule a task', 'monitor X and send to Y'. This skill focuses on workflow creation, module discovery, and JSON generation. For DEBUGGING or FIXING existing workflows, use the workflow-fixer skill instead."
---

# Workflow Builder

**For debugging**: Use `/fix-workflow`

## BEFORE YOU START

⚠️ **For complex workflows (8+ steps, database operations, or advanced features), you MUST read:**
```bash
Read ../workflow-generator/examples.md
```

Examples show:
- Database deduplication patterns (examples #4, #5)
- Parallel AI calls and complex transformations
- zipToObjects with arrays (NOT strings)
- AI SDK .content extraction for text operations
- Dynamic table creation patterns

**Simple workflows (1-7 steps)** with common modules can skip examples.md and use this guide only.

---

## Process

### 1. Parse Request
Identify: **What data** → **Transform** → **When to run**

### 2. Search Modules
```bash
npx tsx scripts/search-modules.ts "keyword"
```
Only use modules from search results. Verify exact names.

**Verify file exists:**
```bash
ls src/modules/{category}/ | grep {modulename}
```

### 3. Detect Parameters
Check function signature in search results:
- **AI SDK** → ALWAYS `{ "options": { ... } }`
- `(params: ...)` → `{ "params": { ... } }`
- `(options: ...)` → `{ "options": { ... } }`
- `(arg1, arg2)` → `{ "arg1": ..., "arg2": ... }`

**Top modules (73% of workflows use these):**
- `utilities.javascript.execute` - Transform data
- `ai.ai-sdk.generateText` - AI generation
- `utilities.array-utils.*` - Array operations
- `utilities.json-transform.parseJson` - Parse JSON

**Array Function Parameters (CRITICAL - Different patterns):**

**REST parameters** (single `arrays` parameter):
```json
// intersection, union, zip
"module": "utilities.array-utils.intersection",
"inputs": {
  "arrays": ["{{array1}}", "{{array2}}"]
}
```
Note: Each array variable is already an array, don't wrap in extra brackets.

**SEPARATE parameters** (distinct parameter names):
```json
// difference uses arr1, arr2
"module": "utilities.array-utils.difference",
"inputs": {
  "arr1": "{{firstArray}}",
  "arr2": "{{secondArray}}"
}
```

**Single array operations** (use `arr` NOT `array`):
```json
// pluck, sortBy, first, last
"module": "utilities.array-utils.pluck",
"inputs": {
  "arr": "{{items}}",
  "key": "name"
}
```

**Always verify** parameter names in search results before using.

### 4. Build JSON

**Minimal structure:**
```json
{
  "version": "1.0",
  "name": "Workflow Name",
  "description": "What it does",
  "trigger": {
    "type": "manual",
    "config": {}
  },
  "config": {
    "steps": [
      {
        "id": "step1",
        "module": "category.module.function",
        "inputs": {},
        "outputAs": "result"
      }
    ],
    "returnValue": "{{result}}",
    "outputDisplay": {
      "type": "table",
      "columns": [
        {"key": "field", "label": "Label", "type": "text"}
      ]
    }
  },
  "metadata": {
    "requiresCredentials": []
  }
}
```

See `examples.md` for complete working examples with annotations.

### 5. Validate & Import

**REQUIRED - run in order:**
```bash
# 1. Auto-fix common issues
npx tsx scripts/auto-fix-workflow.ts workflow/{name}.json --write

# 2. Validate structure
npx tsx scripts/validate-workflow.ts workflow/{name}.json

# 3. Validate output display
npx tsx scripts/validate-output-display.ts workflow/{name}.json

# 4. Test execution
npx tsx scripts/test-workflow.ts workflow/{name}.json

# 5. Import to database
npx tsx scripts/import-workflow.ts workflow/{name}.json
```

**If errors**: Use `/fix-workflow` for debugging.

---

## Critical Rules (Top 5 Mistakes)

1. **returnValue and outputDisplay at `config` level** (NOT inside outputDisplay)
   ```json
   "config": {
     "steps": [...],
     "returnValue": "{{var}}",
     "outputDisplay": {...}
   }
   ```

2. **AI SDK requires options wrapper + .content for text**
   ```json
   "inputs": { "options": { "prompt": "...", "model": "gpt-4o-mini" } }
   ```
   Access text: `{{aiOutput.content}}`

3. **zipToObjects: ALL fields must be arrays of equal length**
   ❌ `"fields": "{{text}}"`
   ✅ `"fields": ["{{item1}}", "{{item2}}"]`

4. **chat-input: fields array REQUIRED**
   Must have: `id`, `label`, `key`, `type`, `required`

5. **Variables: Use `{{outputAs}}` NOT `{{stepId.outputAs}}`**

---

## Trigger Configurations (Complete)

### Manual (testing/on-demand - 47% usage)
```json
"trigger": { "type": "manual", "config": {} }
```

### Cron (scheduled - 13% usage)
```json
"trigger": {
  "type": "cron",
  "config": {
    "schedule": "0 9 * * *"
  }
}
```
**schedule**: Use a sensible default based on workflow purpose:
- Daily workflows: `"0 9 * * *"` (9 AM daily)
- Hourly checks: `"0 * * * *"` (every hour)
- Frequent updates: `"*/15 * * * *"` (every 15 min)

**Users never see cron syntax** - they select from easy presets in UI:
- "Every 5 minutes", "Every hour", "Daily at 9 AM", "Weekly (Monday 9 AM)", etc.

**After import**: Users click workflow Settings → Choose schedule from dropdown with human-readable options.

### Chat (simple message trigger)
```json
"trigger": {
  "type": "chat",
  "config": { "inputVariable": "userMessage" }
}
```
Access message: `{{trigger.userMessage}}`

### Chat-input (forms with validation)
```json
"trigger": {
  "type": "chat-input",
  "config": {
    "fields": [
      {
        "id": "1",
        "label": "Topic",
        "key": "topic",
        "type": "text",
        "required": true
      }
    ]
  }
}
```
**Field types**: text, textarea, number, date, select, checkbox
**Select type requires**: `"options": ["Option 1", "Option 2"]`
**Checkbox type**: Returns boolean true/false
**Required properties**: id, label, key, type, required
Access: `{{trigger.topic}}`

### Gmail/Outlook (email monitoring)
```json
"trigger": {
  "type": "gmail",
  "config": {
    "filters": {
      "label": "inbox",
      "isUnread": true
    },
    "pollInterval": 60
  }
}
```
**Filters** (all optional): label, from, to, subject, hasAttachment, isUnread
**pollInterval**: seconds (60 = 1 min, 300 = 5 min, 3600 = 1 hour)
Access trigger data: `{{trigger.userId}}`, `{{trigger.email.id}}`
Use gmail/outlook modules to fetch full email details with these IDs.

### Webhook (HTTP trigger)
```json
"trigger": { "type": "webhook", "config": {} }
```
Access: `{{trigger.body}}`, `{{trigger.headers}}`, `{{trigger.query}}`

### Telegram/Discord (bot messages)
```json
"trigger": { "type": "telegram", "config": {} }
"trigger": { "type": "discord", "config": {} }
```
Access: `{{trigger.message}}`, `{{trigger.chatId}}`, `{{trigger.userId}}`

---

## Quick Reference

**Variable syntax:**
- Step output: `{{varName}}`
- Trigger data: `{{trigger.field}}`
- Nested: `{{var.property}}`, `{{array[0].field}}`
- Inline: `"Found {{count}} items"`

**Credentials:**
- Explicit: `{{credential.openai_api_key}}`
- Legacy: `{{user.openai}}`
- Short: `{{openai}}`

**Output displays (47% use table):**
- `table`: Needs `columns` array
- `text`: Plain text
- `list`: Array items
- `markdown`: Rich text
- `json`: Raw data

**Output Display Type Compatibility (CRITICAL):**

| Display Type | Return Type Required | Common Mistake | Fix |
|--------------|---------------------|----------------|-----|
| table | Array of objects | AI SDK returns object | Use array wrapper or forEach |
| text/markdown | String | AI SDK returns object | Use `{{ai.content}}` |
| list | Array | Single object | Wrap in array: `[{{item}}]` |
| json | Any | N/A | Always works |

**AI SDK Type Mismatch** (most common error):
```json
// ❌ WRONG - AI returns {content: "...", usage: {...}}
"returnValue": "{{aiOutput}}",
"outputDisplay": { "type": "text" }

// ✅ CORRECT - Extract .content for text
"returnValue": "{{aiOutput.content}}",
"outputDisplay": { "type": "text" }

// ✅ CORRECT - For table, need array
"returnValue": "[{{aiOutput}}]",  // Wrap in array
"outputDisplay": {
  "type": "table",
  "columns": [
    {"key": "content", "label": "Generated Text", "type": "text"}
  ]
}
```

**Table Column Validation:**
- Required: `key`, `label`, `type`
- Valid types: text, number, date, link, boolean
- Key must exist in returned objects

**Common patterns (from examples.md):**
1. Fetch → Transform → Display (53%)
2. AI Generate → Format → Display (40%)
3. Complex Multi-Step (7%)

---

## Troubleshooting

**Module not found**: Re-search with different keywords
**AI SDK errors**: Check options wrapper and .content access
**Variable undefined**: Check outputAs in previous steps
**Credential error**: `grep "credential\." workflow/*.json` for exact names

**For detailed debugging**: Use `/fix-workflow` command

**For complete examples**: Read `examples.md` (512 lines of annotated workflows)
