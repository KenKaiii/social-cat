# Setup Instructions for New Users

**One-command setup for the complete development environment.**

## Prerequisites

Before starting, ensure you have installed:

1. **Node.js 20+** - [Download here](https://nodejs.org/)
2. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
3. **Git** - Usually pre-installed on macOS/Linux

## Setup (Literally 1 Command)

```bash
npm run setup
```

That's it! The script will:

✅ Check prerequisites (Node.js 20+, Docker)
✅ Install all dependencies
✅ Start Docker Desktop (if not running)
✅ Pull PostgreSQL + Redis images
✅ Start containers
✅ Create `.env.local` with sensible defaults
✅ Generate AUTH_SECRET automatically
✅ Run database migrations
✅ Verify everything works

**Time**: ~5 minutes (mostly downloading Docker images on first run)

## What You Need to Configure

After setup completes, edit `.env.local` and add:

```bash
# Required - get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-actual-key-here
```

Everything else is pre-configured! Though you can optionally add:

- Twitter API credentials
- YouTube OAuth credentials
- Instagram access tokens
- Other social media APIs

## Start Development

```bash
npm run dev
```

Open: http://localhost:3000

Login: `admin@b0t.dev` / `admin`

## Verify Queue System

```bash
curl http://localhost:3000/api/workflows/queue/stats
```

Should return:
```json
{
  "queue": {
    "available": true,
    "redis": true
  }
}
```

## Daily Workflow

### Start Working

```bash
npm run dev  # Automatically starts Docker if needed
```

### Stop Working

```bash
# Press Ctrl+C to stop dev server
npm run docker:stop  # Optional: Stop Docker containers
```

## Useful Commands

```bash
# Setup (first time only)
npm run setup          # Complete automated setup

# Development
npm run dev            # Start dev server + Docker
npm run db:studio      # Open database GUI

# Docker management
npm run docker:start   # Start PostgreSQL + Redis
npm run docker:stop    # Stop containers
npm run docker:logs    # View container logs
npm run docker:clean   # Delete all data (fresh start)

# Database
npm run db:push        # Update schema after editing src/lib/schema.ts
```

## Troubleshooting

### "Docker is not running"

Start Docker Desktop app and run `npm run setup` again.

### "Port 5432 already in use"

You have PostgreSQL running locally. Either:
- Stop it: `brew services stop postgresql` (macOS)
- Or change port in `docker-compose.yml`

### Need to Reset Everything?

```bash
npm run docker:clean  # Deletes all data
npm run setup        # Starts fresh
```

## What's Running?

After setup, you have:

| Service | URL | Purpose |
|---------|-----|---------|
| Next.js App | http://localhost:3000 | Your application |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Queue + Cache |
| Drizzle Studio | http://localhost:4983 | DB GUI (when running) |

## Production Parity

Your local environment is **identical** to production:

- ✅ Same database (PostgreSQL)
- ✅ Same queue system (Redis + BullMQ)
- ✅ Same concurrent execution (10 workflows)
- ✅ No deployment surprises

## Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - Detailed guide
- **[Docker Setup](docs/DOCKER_SETUP.md)** - Docker deep dive
- **[Concurrent Workflows](docs/CONCURRENT_WORKFLOWS.md)** - Queue system
- **[Migrating](docs/MIGRATING_TO_DOCKER.md)** - For existing users

## Quick Test

1. Start dev: `npm run dev`
2. Open http://localhost:3000
3. Login: admin@b0t.dev / admin
4. Go to `/workflows`
5. Try: "Fetch Hacker News RSS feed and show me the top story"
6. Watch it execute!

## Getting Help

- Check `docs/` folder for guides
- Review `docs/DOCKER_SETUP.md` for Docker issues
- Check `docker compose logs` for container errors

---

**That's it!** You're ready to build workflows. 🚀
