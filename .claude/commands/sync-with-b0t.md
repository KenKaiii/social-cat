---
description: Sync YOUR fork with original KenKaiii/b0t repo
---

Get the latest updates from the original b0t project and merge into your branches.

## Process:
1. Save any uncommitted work (stash if needed)
2. Switch to main: `git checkout main`
3. Pull from original: `git pull upstream main`
4. Push to YOUR fork: `git push origin main`
5. Switch to smarter-b0t: `git checkout smarter-b0t`
6. Merge main into smarter-b0t: `git merge main`
7. Handle conflicts if any
8. Restore stashed work

## Example:
```
You: /sync-with-b0t

Me:
Checking for updates from KenKaiii/b0t...
Found 5 new commits:
- Updated dashboard
- Fixed memory leak
- Added new API

Proceed? (yes/no)

You: yes

Me:
✅ Main updated from KenKaiii/b0t
✅ Smarter-b0t merged with latest
✅ Your custom work preserved

New commits: 5
Files changed: 12
```
