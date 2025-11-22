# Complete Module Categories

## All Available Categories (16 total)

1. **ai** - AI/ML models, agents, vector databases, text/image/video generation
2. **business** - CRM, invoicing, sales (HubSpot, Salesforce, QuickBooks, DocuSign, etc.)
3. **communication** - Messaging, email, notifications (Slack, Discord, Telegram, Gmail, Twilio, etc.)
4. **content** - Media creation, design (Canva, Figma, Unsplash, Pexels, etc.)
5. **data** - Databases, storage, analytics (PostgreSQL, MongoDB, Airtable, Google Sheets, Notion, etc.)
6. **dataprocessing** - Big data, ETL, ML platforms (BigQuery, Snowflake, Kafka, HuggingFace, etc.)
7. **devtools** - CI/CD, deployment, monitoring (GitHub, Vercel, Netlify, Sentry, DataDog, etc.)
8. **ecommerce** - Online stores, marketplaces (Shopify, WooCommerce, Amazon, eBay, Etsy, etc.)
9. **external-apis** - Third-party APIs (RapidAPI, HackerNews, etc.)
10. **leads** - Lead generation, enrichment (Apollo, Hunter, Clearbit, PhantomBuster, etc.)
11. **mcp** - MCP server management
12. **payments** - Payment processing (Stripe, etc.)
13. **productivity** - Calendars, forms, project management (Calendly, Linear, Typeform, etc.)
14. **social** - Social media platforms (Twitter, LinkedIn, Reddit, Instagram, YouTube, etc.)
15. **utilities** - Core utilities (math, arrays, strings, dates, JSON, HTTP, validation, etc.)
16. **video** - Video processing (Heygen, Runway, ElevenLabs, Whisper, Vimeo, TikTok, etc.)

## How to Find Modules

**ALWAYS search before building:**

```bash
curl "http://localhost:3123/api/modules/search?q=&limit=5"<keyword>
```

Use the exact `path` from search results in your YAML.

## Utilities (No API Keys)

**JavaScript Execution:**
- `utilities.javascript.execute` - Custom code with context
- `utilities.javascript.evaluateExpression` - Simple expressions
- `utilities.javascript.filterArray` - Filter with custom condition
- `utilities.javascript.mapArray` - Transform array items

**Math Operations:**
- `utilities.math.add`, `subtract`, `multiply`, `divide`
- Note: For max/min with arrays, use `utilities.array-utils.max/min`

**Array Operations:**
- `utilities.array-utils.sum`, `average`, `max`, `min`
- `utilities.array-utils.first`, `last`, `pluck`, `unique`
- `utilities.array-utils.sortBy`, `groupBy`, `flatten`

**String Operations:**
- `utilities.string-utils.toSlug`, `truncate`, `capitalize`
- `utilities.string-utils.camelCase`, `pascalCase`

**Date/Time:**
- `utilities.datetime.now`, `formatDate`, `parseDate`
- `utilities.datetime.addDays`, `addHours`, `subtractDays`

**JSON/Data:**
- `utilities.json-transform.get`, `set`, `pick`, `omit`, `merge`
- `utilities.csv.parse`, `stringify`

## AI Modules (Requires API Keys)

**Text Generation:**
- `ai.ai-sdk.generateText` - Generate text with AI
  - Params: `prompt`, `model`, `provider`
  - Models: `gpt-4o-mini`, `claude-3-5-sonnet-20241022`
  - Providers: `openai`, `anthropic`

## Social Media (Requires Credentials)

**Twitter:**
- `social.twitter.searchTweets` - Search tweets
- `social.twitter.replyToTweet` - Reply to tweet

**Reddit:**
- `social.reddit.search` - Search posts
- `social.reddit.comment` - Comment on post

## Data/Storage

**Database:**
- `data.drizzle-utils.queryWhereIn` - Check if IDs exist (for deduplication)
- `data.drizzle-utils.insertRecord` - Store data with TTL
- `data.drizzle-utils.updateRecord` - Update existing record
- `data.drizzle-utils.deleteRecord` - Delete record

## Module Usage Patterns

### Pattern: Custom JavaScript Logic
```yaml
- module: utilities.javascript.execute
  id: custom-logic
  inputs:
    code: "return data.filter(x => x.score > 80);"
    context:
      data: "{{previousStep}}"
```

### Pattern: AI Generation
```yaml
- module: ai.ai-sdk.generateText
  id: generate
  inputs:
    prompt: "Write about {{topic}}"
    model: gpt-4o-mini
    provider: openai
```

### Pattern: Array Processing
```yaml
- module: utilities.array-utils.sum
  id: calculate-total
  inputs:
    arr: "{{numbers}}"
```

## Critical Notes

- **Wrapper modules** (ai.ai-sdk, utilities.javascript, data.drizzle-utils): Inputs auto-wrapped
- **Direct modules** (utilities.math, array-utils, string-utils): No wrapping needed
- **Search first**: Always search for modules rather than guessing names
- **Check signature**: Module search shows exact parameter names
