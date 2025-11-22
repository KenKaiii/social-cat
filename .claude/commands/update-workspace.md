---
name: update-workspace
description: Update skills/commands in workspace version with proper npm→API and relative→absolute path transformations
---

# Update Workspace Files

When you update skills or commands, they need to exist in **TWO** locations with different formats.

## The Two Versions

### 1. Project Version
- **Location:** `.claude/skills/` and `.claude/commands/`
- **Commands:** npm scripts (`npm run modules:search`, `npm run workflow:build`)
- **Paths:** Relative (`.claude/skills/...`)
- **Purpose:** Local development

### 2. Workspace Version (deployed to users)
- **Location:** `.claude/skills-workspace/` (gets copied to `~/Documents/b0t/.claude/skills/`)
- **Commands:** HTTP API (`curl "http://localhost:3123/api/modules/search..."`)
- **Paths:** Absolute (`/Users/.../Documents/b0t/.claude/skills/...`)
- **Purpose:** Build mode for users

## Update Process

### Step 1: Edit Project Version First
Make all changes in `.claude/skills/` or `.claude/commands/` first.
Test that everything works with npm scripts.

### Step 2: Copy to Workspace
```bash
# For skills:
rm -rf .claude/skills-workspace/SKILL_NAME/
cp -r .claude/skills/SKILL_NAME/ .claude/skills-workspace/SKILL_NAME/

# Commands are auto-copied (they're in ALLOWED_COMMANDS in src/lib/agent-workspace.ts)
```

### Step 3: Transform Commands (npm → API)

In the workspace version, replace all npm commands:

```bash
cd .claude/skills-workspace/SKILL_NAME/

# Module search
find . -name "*.md" -exec sed -i '' 's|npm run modules:search \([a-z-]*\)|curl "http://localhost:3123/api/modules/search?q=\1\&limit=5"|g' {} \;
find . -name "*.md" -exec sed -i '' 's|npm run modules:search <keyword>|curl "http://localhost:3123/api/modules/search?q=<keyword>\&limit=5"|g' {} \;
find . -name "*.md" -exec sed -i '' 's|npm run modules:search <platform-name>|curl "http://localhost:3123/api/modules/search?q=<platform-name>\&limit=5"|g' {} \;

# Workflow build
sed -i '' 's|npm run workflow:build plans/\([^`]*\)|curl -X POST http://localhost:3123/api/workflows/build-from-plan -H "Content-Type: application/json" -d '"'"'{"planPath": "plans/\1"}'"'"'|g' skill.md
```

### Step 4: Transform Paths (Relative → Absolute)

In the workspace version, update reference paths:

```bash
cd .claude/skills-workspace/SKILL_NAME/

# Update paths in skill.md
sed -i '' 's|`.claude/skills/|`/Users/kenkai/Documents/b0t/.claude/skills/|g' skill.md
```

### Step 5: Verify

Check workspace version:
```bash
# Should find NO npm commands
grep "npm run" .claude/skills-workspace/SKILL_NAME/skill.md

# Should find API calls
grep "curl.*api" .claude/skills-workspace/SKILL_NAME/skill.md

# Should find absolute paths
grep "/Documents/b0t/" .claude/skills-workspace/SKILL_NAME/skill.md
```

## Deployment

Files in `.claude/skills-workspace/` automatically deploy to users' `~/Documents/b0t/.claude/skills/` when they initialize their workspace (via `src/lib/agent-workspace.ts`).

## Quick Reference

| Item | Project | Workspace |
|------|---------|-----------|
| Module Search | `npm run modules:search` | `curl "http://localhost:3123/api/modules/search..."` |
| Workflow Build | `npm run workflow:build` | `curl -X POST .../build-from-plan` |
| Paths | `.claude/skills/...` | `/Users/.../Documents/b0t/.claude/skills/...` |

## Common Patterns

**For any skill with module search:**
- Project: Uses `npm run modules:search <keyword>`
- Workspace: Uses `curl "http://localhost:3123/api/modules/search?q=<keyword>&limit=5"`

**For any skill referencing other files:**
- Project: Relative paths like `.claude/skills/SKILL_NAME/references/file.md`
- Workspace: Absolute paths like `/Users/kenkai/Documents/b0t/.claude/skills/SKILL_NAME/references/file.md`

**For plans directory:**
- Project: `plans/`
- Workspace: `/Users/kenkai/Documents/b0t/plans/`

## Checklist

After updating:
- [ ] Edited project version first
- [ ] Tested with npm scripts
- [ ] Copied to workspace
- [ ] Transformed npm → API calls
- [ ] Transformed relative → absolute paths
- [ ] Verified no npm commands in workspace version
- [ ] Verified API calls present in workspace version

## Remember

✅ **DO:** Edit project version → Copy → Transform
❌ **DON'T:** Edit workspace version directly
