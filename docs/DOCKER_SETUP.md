# Docker Development Setup

Production-like development environment using Docker containers for PostgreSQL and Redis.

## Why Docker for Development?

✅ **Production Parity** - Same database (PostgreSQL) as production, no SQLite quirks
✅ **Easy Deployment** - Environment works identically locally and in production
✅ **Team Consistency** - Everyone has the same setup, no "works on my machine"
✅ **Full Features** - Redis queue + PostgreSQL from day one
✅ **Clean Isolation** - Database/Redis isolated from your system

## Prerequisites

- Docker Desktop installed and running
- Node.js 20+ installed
- Git

## Quick Start (5 minutes)

### 1. Initial Setup

```bash
# Clone and install dependencies (if not already done)
npm install

# Run the setup script
npm run docker:setup
```

This will:
1. Create `.env.local` from example (if needed)
2. Start PostgreSQL and Redis containers
3. Run database migrations
4. Verify everything is working

### 2. Configure Environment

Edit `.env.local` and add your API keys:

```bash
# Required
OPENAI_API_KEY=sk-your-key-here
AUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32

# Optional (for social media features)
TWITTER_API_KEY=your-key
# ... etc
```

### 3. Start Development

```bash
# Start Docker services + Next.js dev server
npm run dev

# Or start just Docker services (if already configured)
npm run docker:start
npm run dev
```

Visit: http://localhost:3000

## Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **App** | http://localhost:3000 | admin@b0t.dev / admin |
| **PostgreSQL** | localhost:5432 | postgres / postgres |
| **Redis** | localhost:6379 | (no auth) |
| **pgAdmin** | http://localhost:5050 | admin@social-cat.dev / admin |
| **Redis Commander** | http://localhost:8081 | (no auth) |

> **Note**: pgAdmin and Redis Commander only run with `npm run docker:debug`

## NPM Scripts

### Essential

```bash
npm run docker:setup    # First-time setup (run once)
npm run dev            # Start dev server (auto-starts Docker if needed)
npm run docker:start   # Start Docker services only
npm run docker:stop    # Stop Docker services
```

### Database

```bash
npm run db:push        # Push schema changes to database
npm run db:studio      # Open Drizzle Studio (database GUI)
npm run db:generate    # Generate migrations
```

### Advanced

```bash
npm run docker:logs    # View Docker logs (all services)
npm run docker:clean   # Stop and delete all data (fresh start)
npm run docker:debug   # Start with GUI tools (pgAdmin + Redis Commander)
```

## Development Workflow

### Daily Development

```bash
# Morning - start work
npm run docker:start   # Start services
npm run dev           # Start app

# During development
npm run db:studio     # View/edit database (optional)

# Evening - stop work
npm run docker:stop   # Stop services (data persists)
```

### Making Database Changes

```bash
# 1. Edit schema in src/lib/schema.ts
# 2. Push changes to database
npm run db:push

# 3. Verify in Drizzle Studio
npm run db:studio
```

### Fresh Start (Reset Everything)

```bash
npm run docker:clean   # Delete all data
npm run docker:setup   # Recreate from scratch
```

## Docker Compose Structure

```yaml
services:
  postgres:       # PostgreSQL 16
  redis:          # Redis 7
  pgadmin:        # Database GUI (debug only)
  redis-commander: # Redis GUI (debug only)
```

### Data Persistence

Data is stored in Docker volumes:
- `postgres_data` - PostgreSQL database
- `redis_data` - Redis queue/cache
- `pgadmin_data` - pgAdmin configuration

**Data survives** `docker:stop` and system restarts
**Data deleted** with `docker:clean`

## Troubleshooting

### "Docker is not running"

**Problem**: Docker Desktop not started

**Fix**:
```bash
# macOS: Open Docker Desktop from Applications
# Windows: Open Docker Desktop from Start menu
# Linux: sudo systemctl start docker
```

### "Port 5432 already in use"

**Problem**: PostgreSQL already running on your system

**Fix**:
```bash
# Stop system PostgreSQL
# macOS:
brew services stop postgresql

# Linux:
sudo systemctl stop postgresql

# Or change port in docker-compose.yml:
ports:
  - "5433:5432"  # Use 5433 instead

# Update .env.local:
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/social_cat_dev
```

### "Port 6379 already in use"

**Problem**: Redis already running on your system

**Fix**:
```bash
# Stop system Redis
# macOS:
brew services stop redis

# Linux:
sudo systemctl stop redis

# Or change port in docker-compose.yml
```

### "Database connection failed"

**Problem**: Database not ready or wrong credentials

**Fix**:
```bash
# 1. Check containers are running
docker compose ps

# 2. Check PostgreSQL logs
npm run docker:logs

# 3. Verify DATABASE_URL in .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_cat_dev

# 4. Test connection manually
docker compose exec postgres psql -U postgres -d social_cat_dev
```

### "Redis connection failed"

**Problem**: Redis not running or wrong URL

**Fix**:
```bash
# 1. Check Redis is running
docker compose ps redis

# 2. Test connection
docker compose exec redis redis-cli ping
# Should return: PONG

# 3. Verify REDIS_URL in .env.local
REDIS_URL=redis://localhost:6379
```

### Container won't start

**Problem**: Corrupted data or configuration

**Fix**:
```bash
# Nuclear option - delete everything and start fresh
npm run docker:clean
npm run docker:setup
```

## GUI Tools (Optional)

Start with debug mode to access GUI tools:

```bash
npm run docker:debug
```

### pgAdmin (PostgreSQL GUI)

1. Open http://localhost:5050
2. Login: admin@social-cat.dev / admin
3. Add server:
   - Name: `Local Dev`
   - Host: `postgres` (container name)
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres`
   - Database: `social_cat_dev`

### Redis Commander (Redis GUI)

1. Open http://localhost:8081
2. Browse Redis keys
3. View queue jobs
4. Monitor memory usage

## Comparison: SQLite vs Docker PostgreSQL

| Feature | SQLite (Old) | Docker PostgreSQL (New) |
|---------|-------------|------------------------|
| Setup Time | Instant | 2 minutes |
| Production Parity | ❌ Different DB | ✅ Same as production |
| Concurrent Writes | ⚠️ Limited | ✅ Excellent |
| Team Sharing | ❌ File-based | ✅ Consistent |
| SQL Features | ⚠️ Limited | ✅ Full PostgreSQL |
| Deployment Issues | ⚠️ Common | ✅ Rare |
| Redis Queue | ❌ No | ✅ Yes |

## Production Deployment

Your local setup matches production exactly:

**Local:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/social_cat_dev
REDIS_URL=redis://localhost:6379
```

**Railway Production:**
```bash
DATABASE_URL=postgresql://user:pass@postgres.railway.internal:5432/railway
REDIS_URL=redis://default:pass@redis.railway.internal:6379
```

Same code, same database, same queue system - just different URLs!

## Advanced Configuration

### Change Database Name

Edit `docker-compose.yml`:
```yaml
postgres:
  environment:
    POSTGRES_DB: my_custom_db  # Change here
```

Update `.env.local`:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/my_custom_db
```

### Add More Services

Edit `docker-compose.yml` to add services:
```yaml
services:
  # ... existing services ...

  minio:  # S3-compatible storage
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
```

### Persist Data Outside Docker

Edit `docker-compose.yml`:
```yaml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      device: /path/to/your/backup/folder
      o: bind
```

## Resource Usage

| Component | Memory | CPU |
|-----------|--------|-----|
| PostgreSQL | 50-100MB | 1-5% |
| Redis | 10-20MB | 1-2% |
| pgAdmin (debug) | 100-200MB | 2-5% |
| Redis Commander (debug) | 50MB | 1-2% |

**Total**: ~200-400MB when running (minimal overhead)

## Next Steps

After setup:
1. ✅ Services running with `npm run docker:start`
2. ✅ `.env.local` configured with API keys
3. 🎯 Create your first workflow at http://localhost:3000/workflows
4. 🎯 Monitor queue at http://localhost:3000/api/workflows/queue/stats

Happy developing! 🚀
