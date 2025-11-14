---
description: Sync your fork with the upstream repository
---

Sync fork with the latest changes from upstream, then optionally merge into current feature branch.

Process:
1. Check `git status` - stash uncommitted changes if any exist
2. Run `git remote -v` to detect upstream remote
   - If no upstream remote exists, guide setup with `git remote add upstream <url>`
3. Fetch from upstream: `git fetch upstream`
4. Show incoming commits: `git log --oneline HEAD..upstream/main` (or upstream/master if main doesn't exist)
5. Ask to confirm sync
6. If confirmed:
   - `git checkout main`
   - `git merge upstream/main --ff-only`
   - `git push origin main`
7. If on a different branch, ask: "Merge main into <branch-name>?"
8. If yes:
   - `git checkout <branch-name>`
   - `git merge main`
   - `git push origin <branch-name>`
9. Restore any stashed changes
10. Show summary: commits synced, files changed, branches updated

Handle merge conflicts with clear guidance if they occur.
