---
description: Sync your fork with the upstream repository
---

Get the latest updates from the upstream repository and merge into your branches.

## What This Does:
- Pulls latest from upstream repository (original repo)
- Updates your main branch
- Merges updates into your custom branch
- Keeps your fork current with upstream

## Process:
1. Save any uncommitted work (stash if needed)
2. Switch to main: `git checkout main`
3. Pull from upstream: `git pull upstream main`
4. Push to your fork: `git push origin main`
5. Switch to your custom branch: `git checkout <your-branch>`
6. Merge main into custom branch: `git merge main`
7. Handle conflicts if any
8. Restore stashed work

## Example:
```
You: /sync-fork

Me:
Checking for updates from upstream...
Found 5 new commits:
- Updated dashboard
- Fixed memory leak
- Added new API

Proceed? (yes/no)

You: yes

Me:
✅ Main updated from upstream
✅ Custom branch merged with latest
✅ Your custom work preserved

New commits: 5
Files changed: 12
```

## When To Use:
- Weekly to stay current with upstream
- Before contributing back
- After seeing new releases from upstream
- When you want latest features/fixes from original

## Safety:
- Stashes your uncommitted work first
- Never overwrites your custom changes
- Shows preview before syncing
- Guides through conflicts
