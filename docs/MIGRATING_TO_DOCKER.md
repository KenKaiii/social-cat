# Migrating to Docker + PostgreSQL

Guide for existing users migrating from SQLite to Docker-based PostgreSQL setup.

## Why Migrate?

**Before (SQLite):**
- ⚠️ Different database from production
- ⚠️ Limited concurrent writes
- ⚠️ No queue system
- ⚠️ Deployment surprises

**After (Docker + PostgreSQL + Redis):**
- ✅ Production-identical environment
- ✅ Full PostgreSQL features
- ✅ Concurrent workflow execution
- ✅ Smooth deployment

## Quick Migration (Fresh Start)

If you don't need to keep existing data:

```bash
# 1. Stop any running dev server
# Press Ctrl+C

# 2. Run automated setup
npm run setup

# 3. Start development
npm run dev
```

Done! Your `.env.local` will be updated automatically to use PostgreSQL.

## Migration with Data Preservation

If you have workflows or data in SQLite you want to keep:

### Step 1: Backup SQLite Data

```bash
# Backup your SQLite database
cp data/local.db data/local.db.backup

# Export workflows to JSON (if you have custom workflows)
# You'll need to manually re-create them or use the import feature
```

### Step 2: Start Docker Services

```bash
# Run the setup
npm run setup
```

### Step 3: Migrate Data Manually

Since SQLite and PostgreSQL have different schema details, you'll need to:

**Option A: Re-create workflows via UI**
1. Export workflow JSONs from old system (if you built custom ones)
2. Import them via `/workflows` page

**Option B: Use database export/import**
```bash
# Export from SQLite
sqlite3 data/local.db ".dump" > sqlite_dump.sql

# Note: Direct SQL import won't work due to syntax differences
# You'll need to manually re-create important records
```

**Option C: Fresh start (recommended)**

Most development data can be safely discarded:
- Workflow runs (history)
- Test data
- Development credentials

Just re-create your workflows through the UI.

## What Changes

### Environment Variables

**Before (SQLite):**
```bash
# .env.local had no DATABASE_URL
# SQLite was used by default
```

**After (PostgreSQL):**
```bash
# .env.local now includes:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_cat_dev
REDIS_URL=redis://localhost:6379
```

### Database Location

**Before:**
- Database file: `data/local.db`
- Local file on your disk

**After:**
- Database: Docker container (PostgreSQL)
- Data persisted in Docker volume
- Survives container restarts
- Deleted with `npm run docker:clean`

### Development Workflow

**Before:**
```bash
npm run dev  # Just start Next.js
```

**After:**
```bash
# Docker services start automatically with npm run dev
npm run dev

# Or manually manage:
npm run docker:start  # Start PostgreSQL + Redis
npm run dev          # Start Next.js
npm run docker:stop  # Stop services
```

## Troubleshooting Migration

### "Database schema mismatch"

If you see schema errors after migration:

```bash
# Force push schema to PostgreSQL
npm run db:push:force
```

### "Cannot connect to database"

Verify Docker is running:

```bash
# Check Docker containers
docker compose ps

# Should show postgres and redis as "running"
```

If not running:
```bash
npm run docker:start
```

### "Data not showing up"

Remember: PostgreSQL is a fresh database. SQLite data doesn't automatically transfer.

You'll need to:
1. Re-create workflows via UI
2. Re-configure credentials in settings
3. Re-run any setup steps

### "Want to go back to SQLite"

Remove DATABASE_URL from `.env.local`:

```bash
# Edit .env.local and comment out:
# DATABASE_URL=postgresql://...

# Restart dev server
npm run dev
```

The app will automatically fall back to SQLite.

## Docker Commands Reference

```bash
# Setup
npm run setup          # First-time complete setup
npm run docker:setup   # Quick Docker-only setup

# Daily usage
npm run dev            # Start everything
npm run docker:start   # Start PostgreSQL + Redis only
npm run docker:stop    # Stop services
npm run docker:logs    # View container logs

# Database
npm run db:push        # Update database schema
npm run db:studio      # Open database GUI

# Cleanup
npm run docker:clean   # Delete all data (fresh start)
```

## FAQ

### Do I need to keep Docker running all the time?

Only when developing. You can stop Docker when not working:
```bash
npm run docker:stop
```

Data persists in Docker volumes.

### How much disk space does this use?

- PostgreSQL image: ~80MB
- Redis image: ~50MB
- Data volumes: Depends on your usage (typically <100MB)
- **Total:** ~200-300MB

### Can I use a different database?

Yes! Just update `DATABASE_URL` in `.env.local`:
```bash
# Use external PostgreSQL
DATABASE_URL=postgresql://user:pass@external-host:5432/dbname

# Use Railway/Neon/Supabase
DATABASE_URL=<your-cloud-postgres-url>
```

### What happens to my SQLite file?

It's not deleted. It stays at `data/local.db`.

To use it again, remove `DATABASE_URL` from `.env.local`.

### Can I run PostgreSQL without Docker?

Yes, if you have PostgreSQL installed locally:

```bash
# Create database
createdb social_cat_dev

# Update .env.local
DATABASE_URL=postgresql://localhost:5432/social_cat_dev

# Don't run docker:start
npm run dev
```

But Docker is recommended for consistency.

## Benefits After Migration

### Development

- ✅ Same database as production
- ✅ Full PostgreSQL features (JSON queries, full-text search, etc.)
- ✅ Better concurrency handling
- ✅ Team members have identical setup

### Queue System

- ✅ 10 concurrent workflows (vs unlimited/risky with SQLite)
- ✅ Automatic retries
- ✅ Rate limiting
- ✅ Production-ready job queue

### Deployment

- ✅ No surprises when deploying to Railway/Render
- ✅ Same queries work locally and in production
- ✅ No SQLite → PostgreSQL migration needed

## Next Steps

After successful migration:

1. ✅ Verify workflows run correctly
2. ✅ Test queue system: http://localhost:3000/api/workflows/queue/stats
3. ✅ Explore database: `npm run db:studio`
4. ✅ Read concurrent workflows guide: `docs/CONCURRENT_WORKFLOWS.md`

Welcome to production-grade development! 🚀
