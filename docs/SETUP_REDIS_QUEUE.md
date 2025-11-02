# Quick Start: Redis Queue Setup

Enable concurrent workflow execution with controlled concurrency.

## What You Get

- ✅ **10 concurrent workflows** running simultaneously (configurable)
- ✅ **Per-user isolation** - 5 users can each run workflows without interfering
- ✅ **Automatic retries** - failed workflows retry 3 times
- ✅ **Queue buffering** - handles 100+ simultaneous requests without crashing
- ✅ **Cron scheduling** - scheduled workflows use the queue too

## Setup (5 minutes)

### 1. Add Redis

**Railway (Recommended):**
```bash
1. Open Railway dashboard
2. Click "New" → "Database" → "Add Redis"
3. Copy the REDIS_URL from Redis service variables
4. Go to your app service → Variables → Add variable:
   REDIS_URL=redis://default:xxx@redis.railway.internal:6379
5. Redeploy your app
```

**Local Development:**
```bash
# Start Redis with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Add to .env.local
echo "REDIS_URL=redis://localhost:6379" >> .env.local

# Restart dev server
npm run dev
```

### 2. Verify It's Working

```bash
# Check queue status
curl http://localhost:3000/api/workflows/queue/stats

# Expected response:
{
  "queue": {
    "available": true,  # ✅ Queue is working
    "redis": true,
    "stats": {
      "waiting": 0,
      "active": 0,
      "completed": 0
    }
  },
  "scheduler": {
    "initialized": true,
    "scheduledWorkflows": 0
  }
}
```

### 3. Test Concurrent Execution

Create 3 workflows and trigger them at the same time:

```bash
# Trigger workflow 1
curl -X POST http://localhost:3000/api/workflows/WORKFLOW_ID_1/run \
  -H "Cookie: authjs.session-token=YOUR_SESSION"

# Trigger workflow 2
curl -X POST http://localhost:3000/api/workflows/WORKFLOW_ID_2/run \
  -H "Cookie: authjs.session-token=YOUR_SESSION"

# Trigger workflow 3
curl -X POST http://localhost:3000/api/workflows/WORKFLOW_ID_3/run \
  -H "Cookie: authjs.session-token=YOUR_SESSION"

# All 3 will execute concurrently!
```

## Without Redis (Fallback)

The system still works without Redis, but:
- ⚠️ No concurrency control (all workflows run in parallel)
- ⚠️ Risk of crashes with 20+ simultaneous workflows
- ⚠️ No automatic retries
- ⚠️ Not recommended for production

## Configuration

Edit `src/instrumentation.ts` to adjust:

```typescript
await initializeWorkflowQueue({
  concurrency: 20,        // Increase to 20 concurrent workflows
  maxJobsPerMinute: 200,  // Rate limit
});
```

## Monitoring

View queue health:
```bash
curl http://localhost:3000/api/workflows/queue/stats
```

## Costs

| Provider | Plan | Cost | Notes |
|----------|------|------|-------|
| Railway Redis | Hobby | $5/mo | Auto-scales, recommended |
| Upstash Redis | Free | $0 | 10K commands/day limit |
| Redis Cloud | Free | $0 | 30MB storage |
| Self-hosted | - | $0 | Requires server management |

## Next Steps

- Read full docs: `docs/CONCURRENT_WORKFLOWS.md`
- Monitor queue: `GET /api/workflows/queue/stats`
- Scale up: Increase concurrency in `instrumentation.ts`
