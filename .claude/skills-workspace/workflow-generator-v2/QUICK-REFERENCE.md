# Workflow Generator V2 - Quick Reference

## Two Versions, Same Goal

### Project Version (this location)
**When to use:** Working directly in the main b0t project
**Location:** `/Users/kenkai/Documents/UnstableMind/b0t/`
**Method:** npm scripts

### Build Mode Version
**When to use:** Interactive agent building in Documents/b0t
**Location:** `/Users/kenkai/Documents/b0t/`
**Method:** HTTP API calls

---

## Quick Command Reference

| Task | Project Version | Build Mode Version |
|------|----------------|-------------------|
| **Search Modules** | `curl "http://localhost:3123/api/modules/search?q=&limit=5"<keyword>` | `curl "http://localhost:3123/api/modules/search?q=<keyword>&limit=5"` |
| **Build Workflow** | `npm run workflow:build plans/file.yaml` | `curl -X POST http://localhost:3123/api/workflows/build-from-plan -H "Content-Type: application/json" -d '{"planPath": "plans/file.yaml"}'` |
| **Plans Location** | `plans/` | `/Users/kenkai/Documents/b0t/plans/` |
| **Reference Paths** | Relative (`.claude/skills/...`) | Absolute (`/Users/kenkai/Documents/b0t/.claude/skills/...`) |

---

## Process (Both Versions)

1. **Ask Questions** → Get trigger type + requirements
2. **Load References** → Read 4 required files (yaml-format, common-modules, common-mistakes, trigger-specific)
3. **Search Modules** → Find exact module paths (MANDATORY - don't guess!)
4. **Build YAML Plan** → Create plans/workflow-name.yaml
5. **Build & Import** → Run build command (npm or API)
6. **Report Success** → Return workflow ID and access URL

---

## Reference Files (Required Reading)

**Always read (4 files):**
1. `references/yaml-format.md` - Structure & syntax
2. `references/common-modules.md` - Module categories
3. `references/common-mistakes.md` - Avoid errors
4. `references/{trigger}-trigger.md` - Trigger-specific (webhook/chat/cron/manual)

**Optional (as needed):**
- `references/modules/ai-modules.md` - AI/ML workflows
- `references/modules/social-modules.md` - Social media
- `references/modules/communication-modules.md` - Email/messaging
- And 4 more category references...

---

## Critical Rules

1. ✅ **ALWAYS search for modules** - Never guess paths
2. ✅ **Read trigger reference** - Each has specific syntax
3. ✅ **Use exact variable names** - e.g., `trigger.body`, not `webhookData`
4. ✅ **Keep it simple** - Don't over-engineer
5. ✅ **Auto-wrapping works** - Don't manually wrap params/options

---

## Example: Creating a Webhook

### 1. Ask Questions
- Trigger: Webhook
- Sync response: Yes
- Output: JSON

### 2. Read References
```
✓ references/yaml-format.md
✓ references/common-modules.md
✓ references/common-mistakes.md
✓ references/webhook-trigger.md
```

### 3. Search Modules
**Project:** `curl "http://localhost:3123/api/modules/search?q=execute&limit=5"`
**Build:** `curl "http://localhost:3123/api/modules/search?q=execute&limit=5"`

### 4. Create YAML
```yaml
name: Webhook Calculator
trigger: webhook
webhookSync: true
output: json
steps:
  - module: utilities.javascript.execute
    id: calc
    inputs:
      code: "return {sum: trigger.body.numbers.reduce((a,b) => a+b, 0)}"
    outputAs: result
```

### 5. Build
**Project:** `npm run workflow:build plans/webhook-calc.yaml`
**Build:** `curl -X POST http://localhost:3123/api/workflows/build-from-plan -H "Content-Type: application/json" -d '{"planPath": "plans/webhook-calc.yaml"}'`

---

## Validation Summary

✅ **32/32 tests passed** (see WORKFLOW-GENERATOR-V2-VALIDATION.md)

- Server running: ✅
- API endpoints working: ✅
- Both versions aligned: ✅
- All reference files present: ✅
- End-to-end workflow creation: ✅

---

**Last Validated:** 2025-11-22
**Status:** Production Ready
