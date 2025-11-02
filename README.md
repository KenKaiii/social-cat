# b0t - AI Workflow Automation Platform

An LLM-first workflow automation platform where users create automations by chatting with AI. No coding, no visual editors—just describe what you want automated.

## Features

- **LLM-generated workflows** - AI writes workflow configurations from natural language
- **100+ pre-built modules** - APIs, databases, social media, AI, utilities, and more
- **Multiple triggers** - Cron schedules, webhooks, Telegram/Discord bots, manual execution
- **Production-ready** - Circuit breakers, retries, rate limiting, structured logging
- **Concurrent execution** - Run 10+ workflows simultaneously with queue management
- **Self-hosted or cloud** - Run on your infrastructure or use hosted version

## Quick Start

### Prerequisites

- Node.js 20+ ([Download](https://nodejs.org/))
- Docker Desktop ([Download](https://www.docker.com/products/docker-desktop/))
- Git

### One-Command Setup

```bash
# Clone and setup everything
git clone <your-repo>
cd social-cat
npm run setup
```

**That's it!** The script handles:
- ✅ Dependency installation
- ✅ Docker container setup (PostgreSQL + Redis)
- ✅ Environment configuration
- ✅ Database migrations
- ✅ Verification

Then just add your `OPENAI_API_KEY` to `.env.local` and:

```bash
npm run dev
```

Visit http://localhost:3000 | Login: `admin@b0t.dev` / `admin`

**📖 Detailed setup guide:** [SETUP_INSTRUCTIONS.md](SETUP_INSTRUCTIONS.md)

## Documentation

- **[Docker Setup](docs/DOCKER_SETUP.md)** - Development environment setup
- **[Concurrent Workflows](docs/CONCURRENT_WORKFLOWS.md)** - Queue system and scaling
- **[Redis Queue Setup](docs/SETUP_REDIS_QUEUE.md)** - Production queue configuration

## Architecture

### Core Workflow System

```
User Prompt → Claude AI → Workflow JSON → Executor → Modules → Results
```

Users describe automations in natural language. Claude generates workflow configurations that reference composable modules. The executor runs workflows sequentially, passing data between steps.

### Modules (100+)

Organized by category in `src/modules/`:

- **Communication**: Slack, Discord, Telegram, Email (Resend)
- **Social Media**: Twitter, YouTube, Instagram, Reddit, GitHub
- **Data**: MongoDB, PostgreSQL, MySQL, Notion, Google Sheets, Airtable
- **AI**: OpenAI, Anthropic Claude
- **Utilities**: HTTP, Files, CSV, Images, PDF, Web Scraping, RSS
- **Payments**: Stripe
- **Productivity**: Google Calendar

Each module exports pure functions with circuit breakers, rate limiting, and error handling.

### Concurrent Execution

Workflows execute through a Redis-backed BullMQ queue:

- **10 concurrent workflows** by default (configurable)
- Automatic retries (3 attempts)
- Rate limiting (100 workflows/minute)
- Per-user isolation

See [CONCURRENT_WORKFLOWS.md](docs/CONCURRENT_WORKFLOWS.md) for details.

## Tech Stack

- **Next.js 15** - React 19, App Router, Server Actions
- **PostgreSQL** - Production database (Drizzle ORM)
- **Redis** - BullMQ job queue and caching
- **TypeScript** - Full type safety
- **Tailwind CSS + shadcn/ui** - Design system
- **OpenAI/Anthropic** - LLM workflow generation
- **NextAuth v5** - Authentication
- **Docker** - Development environment

## Development Workflow

```bash
# Start Docker services
npm run docker:start

# Start development server
npm run dev

# View database
npm run db:studio

# Run migrations
npm run db:push

# Type checking
npm run typecheck

# Linting
npm run lint

# Stop Docker services
npm run docker:stop
```

## Project Structure

```
src/
├── app/                 # Next.js 15 App Router
│   ├── api/            # REST API endpoints
│   ├── dashboard/      # Main dashboard
│   ├── workflows/      # Workflow management
│   └── settings/       # User settings
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   ├── workflow/      # Workflow UI
│   └── dashboard/     # Dashboard widgets
├── modules/           # ⭐ Composable automation modules
│   ├── communication/ # Slack, Discord, Email, etc.
│   ├── social/        # Twitter, YouTube, Instagram
│   ├── data/          # Databases, Google Sheets
│   ├── ai/            # OpenAI, Anthropic
│   ├── utilities/     # HTTP, Files, Images
│   ├── payments/      # Stripe
│   └── productivity/  # Google Calendar
├── lib/               # Core business logic
│   ├── workflows/     # Workflow execution engine
│   ├── jobs/          # BullMQ job queue
│   ├── schema.ts      # Drizzle ORM models
│   ├── db.ts          # Database connection
│   └── auth.ts        # Authentication
└── instrumentation.ts # App initialization
```

## Creating Workflows

### Via Chat (Recommended)

1. Navigate to `/workflows`
2. Describe your automation in natural language
3. Claude generates and saves the workflow
4. Execute manually or schedule with cron

### Example Prompts

```
"Check my Twitter mentions every hour and reply to questions with AI"

"Every morning at 9am, fetch trending topics and post a summary to Slack"

"When someone emails me, save it to Notion and notify me on Discord"

"Scrape Hacker News front page daily and email me the top stories"
```

### Workflow Configuration (JSON)

```json
{
  "steps": [
    {
      "id": "fetch_rss",
      "module": "utilities.rss.parseFeed",
      "inputs": {
        "url": "https://news.ycombinator.com/rss"
      },
      "outputAs": "feed"
    },
    {
      "id": "send_email",
      "module": "communication.email.sendEmail",
      "inputs": {
        "to": "user@example.com",
        "subject": "Top HN Stories",
        "text": "{{feed.items[0].title}}"
      }
    }
  ]
}
```

## Performance

- **Execution Speed**: 100-500ms for simple workflows (3-5x faster than n8n)
- **Concurrent Capacity**: 10-40 workflows simultaneously (configurable)
- **Memory Usage**: 300-500MB typical (vs 1-2GB for n8n)
- **Cost**: $15-20/month (2GB server + Redis) vs $35-75/month for n8n

## License

MIT

## Support

- **Documentation**: See `docs/` folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

Built with [Next.js](https://nextjs.org), [Drizzle ORM](https://orm.drizzle.team), and [BullMQ](https://docs.bullmq.io)
