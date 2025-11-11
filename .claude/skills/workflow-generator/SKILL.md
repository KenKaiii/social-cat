---
name: workflow-generator
description: "YOU MUST USE THIS SKILL when the user wants to create, build, or generate a workflow automation. Activate for requests like: 'create a workflow', 'build a workflow', 'generate a workflow', 'make a workflow', 'I want to automate', 'automate X to Y', 'schedule a task', 'monitor X and send to Y'. This skill searches for relevant modules, builds JSON config, validates, tests, and imports workflows to database. DO NOT use generic file reading/writing - use this skill instead for workflow generation tasks."
---

# Workflow Generator

## Process

### 1. Parse Request
Identify: **What data** → **Transform** → **When to run**

### 2. Search Modules
```bash
npx tsx scripts/search-modules.ts "keyword"
```
**Only use modules from search results.** Verify exact names.

**CRITICAL: Verify file exists before using:**
```bash
# If search shows: devtools.github.getTrendingRepositories
# Check: ls src/modules/devtools/ | grep github
# If file is "github.ts", module path is correct
```

**Module Parameter Detection:**
Check the function signature in search results to determine wrapper type:
- **AI SDK** (`ai.ai-sdk.*`) → ALWAYS use `{ "options": { ... } }`
- Signature shows `(params: ...)` → Wrap with `{ "params": { ... } }`
- Signature shows `(options: ...)` → Wrap with `{ "options": { ... } }`
- Signature shows `(arg1, arg2)` → Direct: `{ "arg1": ..., "arg2": ... }`
- Destructured `({ field1, field2 })` → Direct: `{ "field1": ..., "field2": ... }`

**Quick Reference:**
- AI SDK → options
- Database (drizzle-utils) → params
- String utils → direct
- Twitter OAuth → params
- Slack → options

### 3. Build JSON

**Pre-flight:**
- Check what API returns (Grep source if needed)
- Keep simple (no unnecessary steps)
- Verify every module exists
- Check signature for parameter wrapper type

**Complete Structure:**
```json
{
  "version": "1.0",
  "name": "Workflow Name",
  "description": "What it does",

  "trigger": {
    "type": "manual|chat|cron|webhook|chat-input",
    "config": {
      // Placement: trigger configuration
    }
  },

  "config": {
    "steps": [
      {
        "id": "stepId",
        "module": "category.module.function",
        "inputs": {
          // Placement: step parameters
        },
        "outputAs": "varName"
      }
    ],
    "returnValue": "{{varName}}",   // Placement: config level
    "outputDisplay": {               // Placement: config level
      "type": "table|list|text|markdown|json",
      "columns": []
    }
  },

  "metadata": {
    "requiresCredentials": ["service"]
  }
}
```

### 4. Validate & Import

**REQUIRED STEPS - Run in order:**

```bash
# 1. Auto-fix common issues (fixes 90% of errors automatically)
npx tsx scripts/auto-fix-workflow.ts workflow/{name}.json --write

# 2. Validate structure and modules
npx tsx scripts/validate-workflow.ts workflow/{name}.json

# 3. Validate output display type compatibility
npx tsx scripts/validate-output-display.ts workflow/{name}.json

# 4. Test execution (optional: add --dry-run for structure preview only)
npx tsx scripts/test-workflow.ts workflow/{name}.json

# 5. If errors occur, fix them and re-run from step 2

# 6. Import to database
npx tsx scripts/import-workflow.ts workflow/{name}.json
```

**Auto-fix handles:**
- AI SDK options wrapper
- AI SDK .content references
- AI SDK min token requirements (≥16)
- zipToObjects string→array conversion
- Module path case normalization
- Variable name typos
- returnValue placement

**What to do when validation fails:**
- **"Module not found"** → Re-search modules with different keywords
- **"Function not found"** → Run `npm run generate:registry` to sync
- **"Variable undefined"** → Check `outputAs` in previous steps
- **"Type mismatch"** → Check function signature and return type
- **"Credential error"** → Check existing workflows for exact credential name

## ⚠️ Critical Requirements (Common Mistakes)

**These are the most common errors. Follow these rules to avoid validation failures:**

1. **returnValue and outputDisplay placement:**
   - ✅ **MUST be at `config` level** (NOT inside outputDisplay)
   - ❌ WRONG: `"outputDisplay": { "returnValue": "..." }`
   - ✅ CORRECT: `"config": { "returnValue": "...", "outputDisplay": {...} }`

2. **AI SDK requirements:**
   - ✅ **ALWAYS** use `{ "options": { ... } }` wrapper for ALL AI SDK functions
   - ✅ **maxTokens MUST be ≥16** (recommend 20+) for OpenAI
   - ✅ AI outputs are objects, use `.content` for text: `{{aiOutput.content}}`
   - ❌ WRONG: `"inputs": { "prompt": "..." }`
   - ✅ CORRECT: `"inputs": { "options": { "prompt": "..." } }`

3. **zipToObjects requirements:**
   - ✅ **ALL fields MUST be arrays** of equal length
   - ❌ WRONG: `"fields": "{{text}}"` (creates character array)
   - ✅ CORRECT: `"fields": ["{{item1}}", "{{item2}}"]`

4. **chat-input trigger requirements:**
   - ✅ **fields array is REQUIRED** with at least one field
   - ✅ Each field MUST have: `id`, `label`, `key`, `type`, `required`
   - ✅ Valid types: `text`, `textarea`, `number`, `date`, `select`, `checkbox`

5. **Variable references:**
   - ✅ Use `{{outputAs}}` NOT `{{stepId.outputAs}}`
   - ✅ Declare variable with `outputAs` before using it in later steps

## Placement Examples

### Trigger Configurations

**Trigger Configuration Rules:**
- **Cron**: Leave config empty `{}` - user configures schedule via UI dropdown
- **Manual, Chat, Webhook**: Leave config empty `{}`
- **Telegram, Discord, Gmail, Outlook**: Can be empty `{}` - user configures via UI (optional default values)
- **Chat-input**: MUST include `fields` array - this is the form structure

**Manual (no config):**
```json
"trigger": {
  "type": "manual",
  "config": {}
}
```

**Chat (conversational - auto-returns AI response):**
```json
"trigger": {
  "type": "chat",
  "config": {}
}
```

**Cron (scheduled - user sets schedule via UI):**
```json
"trigger": {
  "type": "cron",
  "config": {}
}
```
**Important:** Do NOT hardcode schedule. User selects from presets (every 5min, hourly, daily, etc.) via UI after import.

**Webhook (no config):**
```json
"trigger": {
  "type": "webhook",
  "config": {}
}
```

**Telegram/Discord/Gmail/Outlook (optional - user configures via UI):**
```json
"trigger": {
  "type": "telegram",  // or discord, gmail, outlook
  "config": {}
}
```
**Note:** Bot tokens, commands, and filters are set by user via UI. Leave empty unless providing sensible defaults.

**Chat Input (form with fields - REQUIRED):**
```json
"trigger": {
  "type": "chat-input",
  "config": {
    "fields": [
      {
        "id": "1",
        "label": "Field Label",
        "key": "fieldName",
        "type": "text",
        "required": true,
        "placeholder": "Enter value..."
      }
    ]
  }
}
```
**IMPORTANT:** `chat-input` requires a `fields` array with at least one field. Each field must have: `id`, `label`, `key`, `type`, `required`. Valid types: `text`, `textarea`, `number`, `date`, `select`, `checkbox`. Access field values using `{{trigger.fieldName}}` where `fieldName` is the field's `key`.

### Step Input Formats

**Direct parameters:**
```json
"inputs": {
  "param1": "value",
  "param2": 123
}
```

**Params wrapper:**
```json
"inputs": {
  "params": {
    "param1": "value",
    "param2": 123
  }
}
```

**Options wrapper (AI SDK always uses this):**
```json
"inputs": {
  "options": {
    "param1": "value",
    "param2": 123
  }
}
```

**JavaScript execute (code + context):**
```json
"inputs": {
  "options": {
    "code": "return data.filter(x => x.id > 5);",
    "context": {
      "data": "{{varName}}"
    }
  }
}
```

### Variable References

**Step output:**
```json
"text": "{{varName}}"           // From outputAs
```

**Trigger input:**
```json
"text": "{{trigger.userMessage}}"   // From trigger config
```

**Nested property:**
```json
"text": "{{aiOutput.content}}"      // AI SDK responses
"name": "{{repos[0].name}}"         // Array indexing
"title": "{{data.items[0].title}}"  // Nested + array
```

**Inline interpolation:**
```json
"message": "Found {{count}} results for {{query}}"  // String templates
```

**Special variables:**
```json
"timestamp": "{{$now}}"             // Current time
```

### Credentials

**Three ways to access credentials:**
```json
// 1. Explicit (recommended)
"apiKey": "{{credential.openai_api_key}}"

// 2. Legacy syntax
"apiKey": "{{user.openai}}"

// 3. Convenience (may conflict with step IDs)
"apiKey": "{{openai}}"
```

**In step inputs:**
```json
"inputs": {
  "params": {
    "apiKey": "{{credential.service_api_key}}"
  }
}
```

**In metadata:**
```json
"metadata": {
  "requiresCredentials": ["service1", "service2"]
}
```

**Common credential names:**

| Service | Credential Name | Parameter | Usage Pattern |
|---------|----------------|-----------|---------------|
| OpenAI | `openai_api_key` or `openai` | `apiKey` | `"apiKey": "{{credential.openai_api_key}}"` |
| Twitter | `twitter_oauth` | `accessToken` | `"accessToken": "{{credential.twitter_oauth}}"` |
| RapidAPI | `rapidapi_api_key` or `rapidapi` | `apiKey` | `"apiKey": "{{credential.rapidapi_api_key}}"` |
| Slack | `slack` | `token` | Usually from environment |
| Google | `google` | varies | Google OAuth credentials |

**Check existing workflows for exact names:**
```bash
grep -h "credential\." workflow/*.json | sort | uniq
```

**OAuth vs API Key patterns:**
- OAuth services (Twitter): Pass `accessToken` parameter (tokens auto-refresh)
- API key services (OpenAI, RapidAPI): Pass `apiKey` parameter

### Output Display

**Table (at config level):**
```json
"config": {
  "steps": [...],
  "returnValue": "{{tableData}}",
  "outputDisplay": {
    "type": "table",
    "columns": [
      { "key": "fieldName", "label": "Display Name", "type": "text" },
      { "key": "url", "label": "Link", "type": "link" }
    ]
  }
}
```

**Text (at config level):**
```json
"config": {
  "steps": [...],
  "returnValue": "{{textOutput}}",
  "outputDisplay": {
    "type": "text"
  }
}
```

**List (at config level):**
```json
"config": {
  "steps": [...],
  "returnValue": "{{arrayOutput}}",
  "outputDisplay": {
    "type": "list"
  }
}
```

**No display (return raw):**
```json
"config": {
  "steps": [...],
  "returnValue": "{{data}}"
  // No outputDisplay
}
```

### AI SDK

**generateText:**
```json
{
  "module": "ai.ai-sdk.generateText",
  "inputs": {
    "options": {
      "prompt": "Your prompt here",
      "model": "gpt-4o-mini",
      "provider": "openai"
    }
  },
  "outputAs": "aiResult"
}
// Access text: "{{aiResult.content}}"
```

**chat:**
```json
{
  "module": "ai.ai-sdk.chat",
  "inputs": {
    "options": {
      "messages": [
        { "role": "system", "content": "System prompt" },
        { "role": "user", "content": "{{trigger.userMessage}}" }
      ],
      "model": "gpt-4o-mini",
      "provider": "openai"
    }
  }
}
```

## Key Rules

**Variables:**
- Use: `{{outputAs}}` not `{{stepId.outputAs}}`
- Trigger: `{{trigger.inputVariable}}`
- Nested: `{{var.property}}`

**Parameters:**
- Check search results for signature
- `(params: ...)` → wrap with `"params"`
- `(options: ...)` → wrap with `"options"`
- Direct destructuring → no wrapper

**AI SDK:**
- Always: `"inputs": { "options": { ... } }`
- Text access: `"{{aiOutput.content}}"`

**Credentials:**
- Format: `"{{credential.service_api_key}}"`
- Check existing workflows for exact names
- List in: `"metadata": { "requiresCredentials": [...] }`

**Output:**
- `returnValue` at `config` level
- `outputDisplay` at `config` level
- Table requires `columns` array

## Common Errors & Solutions

### Module Errors

**"Module 'x.y.z' not found in registry"**
- Re-search modules with different keywords
- Module path must be lowercase: `social.twitter` not `Social.Twitter`
- Verify with: `npx tsx scripts/search-modules.ts "keyword"`

**"Function not found in module"**
- Registry may be out of sync with actual module files
- Run: `npm run generate:registry` to regenerate registry
- Registry is auto-generated from actual module files (not manually maintained)
- When to regenerate:
  - After adding new modules
  - After renaming functions
  - After pulling code changes
  - If function exists but validation says it doesn't
- Check module source: `cat src/modules/{category}/{module}.ts`

### AI SDK Errors

**"prompt is not defined" or "options is undefined"**
- AI SDK ALWAYS needs options wrapper
- ❌ WRONG: `"inputs": { "prompt": "..." }`
- ✅ CORRECT: `"inputs": { "options": { "prompt": "..." } }`

**"maxOutputTokens must be >= 16"**
- OpenAI requires minimum 16 tokens
- Auto-fix sets to 20 if too low
- Manually set: `"maxTokens": 20` or higher

**AI output used in string function fails**
- AI returns objects, not strings
- ❌ WRONG: `{{aiOutput}}` for text operations
- ✅ CORRECT: `{{aiOutput.content}}` to extract text

### Variable Errors

**"Variable 'x' is undefined"**
- Check variable declared in previous step with `outputAs`
- Use `{{outputAs}}` NOT `{{stepId.outputAs}}`
- Variables must be declared before use

### Array/Data Errors

**"All fields must be arrays of equal length" (zipToObjects)**
- Don't pass strings like `"{{text}}"`
- ❌ WRONG: `"fields": "{{text}}"` (creates char array)
- ✅ CORRECT: `"fields": ["{{item1}}", "{{item2}}"]`

### Credential Errors

**"credential.X is undefined"**
- Check existing workflows for exact credential name
- Run: `grep "credential\." workflow/*.json`
- Common names: `openai_api_key`, `twitter_oauth`, `rapidapi_api_key`
- List in metadata: `"requiresCredentials": ["service"]`

### Validation Errors

**"returnValue must be at config level"**
- ❌ WRONG: Inside `outputDisplay`
- ✅ CORRECT: At same level as `steps` and `outputDisplay`

**"chat-input fields required"**
- Must have `fields` array with at least one field
- Each field needs: `id`, `label`, `key`, `type`, `required`

## Testing Strategy

**Dry-run (structure check only):**
```bash
npx tsx scripts/test-workflow.ts workflow/{name}.json --dry-run
```
- Shows step flow and variable dependencies
- No actual execution
- Fast preview

**Full test (actual execution):**
```bash
npx tsx scripts/test-workflow.ts workflow/{name}.json
```
- Temporary import to database
- Real execution with actual API calls
- Auto cleanup after test
- Smart error analysis with fix suggestions

**When to test:**
1. After validation passes
2. Before importing to production
3. When credentials are configured
4. To verify output format

**Test output includes:**
- Execution duration
- Output compatibility check
- Error category (credential/network/type/etc.)
- Actionable fix suggestions

## Advanced Features

### Automatic Parallelization

The executor automatically detects steps that can run in parallel:

```json
{
  "steps": [
    { "id": "fetch1", "module": "...", "outputAs": "data1" },
    { "id": "fetch2", "module": "...", "outputAs": "data2" },  // Runs parallel with fetch1
    { "id": "combine", "module": "...", "inputs": { "a": "{{data1}}", "b": "{{data2}}" } }  // Waits for both
  ]
}
```

- No configuration needed
- 3x+ speedup for independent operations
- Logged in execution logs

### Control Flow (Advanced)

**Condition Step:**
```json
{
  "id": "checkStatus",
  "type": "condition",
  "condition": "{{status}} === 'active'",
  "then": [...steps if true],
  "else": [...steps if false]
}
```

**ForEach Loop:**
```json
{
  "id": "processItems",
  "type": "forEach",
  "items": "{{arrayVar}}",
  "itemVariable": "item",
  "steps": [
    { "id": "process", "inputs": { "data": "{{item}}" } }
  ]
}
```

**While Loop:**
```json
{
  "id": "retry",
  "type": "while",
  "condition": "{{attempts}} < 3",
  "maxIterations": 100,
  "steps": [...]
}
```

### Database Operations

**Tables auto-create from data structure:**
- `string` → TEXT
- `number` → INTEGER
- `Date` → TIMESTAMP
- No migrations needed

```json
{
  "module": "data.drizzle-utils.insertRecord",
  "inputs": {
    "params": {
      "tableName": "leads",
      "data": {
        "name": "{{name}}",
        "email": "{{email}}",
        "score": 95
      }
    }
  }
}
```

### OAuth Token Management

Tokens auto-refresh for supported providers:
- Twitter OAuth
- YouTube
- GitHub

No manual token management needed. System handles expiration and refresh automatically.

## Workflow Management

### Updating Existing Workflows

**When user wants to modify an existing workflow:**

1. **Read the existing workflow:**
   ```bash
   cat workflow/{name}.json
   ```

2. **Make changes** to the JSON file

3. **Follow validation pipeline:**
   ```bash
   npx tsx scripts/auto-fix-workflow.ts workflow/{name}.json --write
   npx tsx scripts/validate-workflow.ts workflow/{name}.json
   npx tsx scripts/test-workflow.ts workflow/{name}.json
   ```

4. **Re-import** (updates existing workflow by ID):
   ```bash
   npx tsx scripts/import-workflow.ts workflow/{name}.json
   ```

**Creating a new version:**
- Change the `name` field in JSON
- Import creates new workflow with new ID
- Old workflow remains unchanged

**Do NOT:**
- Manually edit database records
- Change workflow IDs in JSON
- Import without testing

### Rate Limiting

**No built-in rate limiting in workflows.** Handle API rate limits:

1. **Add delays between requests:**
   ```json
   {
     "module": "utilities.delay.sleep",
     "inputs": { "milliseconds": 1000 }
   }
   ```

2. **Use batch processing** with ForEach loops:
   ```json
   {
     "type": "forEach",
     "items": "{{batch}}",
     "maxConcurrency": 1  // Process one at a time
   }
   ```

3. **Handle rate limit errors:**
   - Test workflow to identify rate limits
   - Add delays between expensive operations
   - User should configure API keys with higher limits if needed

4. **For production workflows:**
   - Suggest user schedules workflows with reasonable frequency
   - Avoid scheduling expensive workflows more than hourly

## Module Categories

16 categories with 140+ services:
- **ai** - Claude, GPT, Gemini, AI SDK
- **business** - CRM, analytics
- **communication** - Slack, email, SMS
- **content** - RSS, scraping, parsing
- **data** - Database, file operations
- **dataprocessing** - Transform, filter, aggregate
- **devtools** - GitHub, APIs, testing
- **ecommerce** - Payments, products
- **external-apis** - RapidAPI, third-party
- **leads** - Lead generation, enrichment
- **payments** - Stripe, payment processing
- **productivity** - Calendar, tasks
- **social** - Twitter, Reddit, LinkedIn
- **utilities** - String, array, validation
- **video** - YouTube, video processing

**Category folder mapping:**
- "Social Media" → `social`
- "Developer Tools" → `devtools`
- "AI & ML" → `ai`

See `examples.md` for complete working workflows.
