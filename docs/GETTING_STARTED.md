# Getting Started with b0t

Complete guide to set up your development environment and start building workflows.

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js 20+** - [Download](https://nodejs.org/)
- ✅ **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- ✅ **Git** - [Download](https://git-scm.com/)
- ✅ **OpenAI API Key** - [Get one](https://platform.openai.com/api-keys)

## Installation (5 Minutes)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd social-cat

# Install dependencies
npm install
```

### Step 2: Start Docker Desktop

**macOS:** Open Docker Desktop from Applications
**Windows:** Open Docker Desktop from Start menu
**Linux:** `sudo systemctl start docker`

Verify Docker is running:
```bash
docker --version
# Should output: Docker version 28.x.x
```

### Step 3: Setup Development Environment

Run the automated setup script:

```bash
npm run docker:setup
```

This will:
1. Create `.env.local` from example (if not exists)
2. Start PostgreSQL and Redis containers
3. Wait for services to be ready
4. Run database migrations

**If `.env.local` already exists**, it will skip creation. Otherwise, you'll be prompted to configure it.

### Step 4: Configure Environment Variables

Edit `.env.local` and add your API keys:

```bash
# Required (minimum to get started)
OPENAI_API_KEY=sk-your-key-here
AUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32

# Database (already configured by Docker setup)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_cat_dev
REDIS_URL=redis://localhost:6379

# Admin credentials (default)
ADMIN_EMAIL=admin@b0t.dev
ADMIN_PASSWORD=admin

# Optional: Add social media credentials later
# TWITTER_API_KEY=...
# YOUTUBE_CLIENT_ID=...
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Step 5: Start Development Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

Login with: `admin@b0t.dev` / `admin`

## Verify Installation

### Check Services

```bash
# Check Docker containers
docker compose ps

# Should show:
# social-cat-postgres   running   0.0.0.0:5432->5432/tcp
# social-cat-redis      running   0.0.0.0:6379->6379/tcp
```

### Test Workflow Queue

```bash
curl http://localhost:3000/api/workflows/queue/stats
```

**Expected response:**
```json
{
  "queue": {
    "available": true,
    "redis": true,
    "stats": { "waiting": 0, "active": 0, "completed": 0 }
  },
  "scheduler": {
    "initialized": true,
    "scheduledWorkflows": 0
  }
}
```

### Open Database GUI (Optional)

```bash
npm run db:studio
```

Opens Drizzle Studio at http://localhost:4983

## Next Steps

### 1. Create Your First Workflow

Navigate to: http://localhost:3000/workflows

Try this prompt:
```
"Fetch the Hacker News RSS feed and extract the top 5 stories"
```

Claude will generate a workflow and execute it.

### 2. Explore Modules

View available modules:
- Open `src/lib/workflows/module-registry.ts`
- 100+ pre-built functions organized by category
- Communication, Social Media, Data, AI, Utilities

### 3. Schedule Workflows

Workflows can run on schedules:

```json
{
  "trigger": {
    "type": "cron",
    "config": {
      "schedule": "0 9 * * *"  // Every day at 9am
    }
  }
}
```

### 4. Monitor Execution

Check workflow runs:
- Dashboard: http://localhost:3000/dashboard
- Queue stats: http://localhost:3000/api/workflows/queue/stats
- Database: `npm run db:studio`

## Daily Workflow

### Starting Work

```bash
# Make sure Docker Desktop is running

# Start development (auto-starts Docker services)
npm run dev
```

### Stopping Work

```bash
# Stop dev server: Ctrl+C

# Stop Docker services (optional - keeps data)
npm run docker:stop
```

### Making Database Changes

```bash
# 1. Edit schema
# Open: src/lib/schema.ts

# 2. Push changes
npm run db:push

# 3. Verify in GUI
npm run db:studio
```

## Troubleshooting

### Docker Not Running

**Error:** `❌ Docker is not running`

**Fix:** Start Docker Desktop application

### Port Already in Use

**Error:** `Port 5432 already in use`

**Fix:** Stop system PostgreSQL or change port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Use 5433 instead
```

Update `.env.local`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/social_cat_dev
```

### Database Connection Failed

**Fix:**
```bash
# Check containers are running
docker compose ps

# View logs
npm run docker:logs

# Restart services
npm run docker:stop
npm run docker:start
```

### Fresh Start

If something goes wrong, reset everything:

```bash
# Delete all data and start fresh
npm run docker:clean
npm run docker:setup
```

## Useful Commands

### Development

```bash
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Run production build
npm run lint             # Run linter
npm run typecheck        # Check TypeScript types
```

### Docker

```bash
npm run docker:setup     # Initial setup
npm run docker:start     # Start services
npm run docker:stop      # Stop services
npm run docker:logs      # View logs
npm run docker:clean     # Delete all data
npm run docker:debug     # Start with GUI tools
```

### Database

```bash
npm run db:push          # Push schema changes
npm run db:studio        # Open database GUI
npm run db:generate      # Generate migrations
```

## Project Structure

```
social-cat/
├── src/
│   ├── app/             # Next.js pages and API routes
│   ├── components/      # React components
│   ├── modules/         # ⭐ Workflow modules (100+)
│   ├── lib/             # Core business logic
│   └── instrumentation.ts
├── docs/                # Documentation
├── scripts/             # Setup scripts
├── docker-compose.yml   # Docker services
├── .env.local          # Your configuration
└── package.json        # Dependencies
```

## Environment Variables Reference

### Required

- `OPENAI_API_KEY` - OpenAI API key
- `AUTH_SECRET` - NextAuth secret (32+ random characters)
- `DATABASE_URL` - PostgreSQL connection (auto-configured)
- `REDIS_URL` - Redis connection (auto-configured)

### Optional

- `TWITTER_API_KEY`, `TWITTER_API_SECRET` - Twitter automation
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` - YouTube automation
- `INSTAGRAM_ACCESS_TOKEN` - Instagram automation
- `WORDPRESS_SITE_URL` - WordPress automation
- `RAPIDAPI_KEY` - Extended features

See `.env.local.example` for full list.

## Resources

- **Documentation**: `/docs` folder
- **Module Registry**: `src/lib/workflows/module-registry.ts`
- **Database Schema**: `src/lib/schema.ts`
- **Workflow Executor**: `src/lib/workflows/executor.ts`

## Getting Help

- Check `docs/` for detailed guides
- Review `docs/DOCKER_SETUP.md` for Docker troubleshooting
- Review `docs/CONCURRENT_WORKFLOWS.md` for queue system details

## What's Next?

After getting comfortable:

1. **Add Social Media Credentials** - Enable Twitter, YouTube, etc.
2. **Create Complex Workflows** - Use loops, conditions, AI
3. **Deploy to Production** - Railway setup guide coming soon
4. **Build Custom Modules** - Extend the platform

Happy automating! 🚀
