# Common Module Categories

## How to Find Modules

```bash
npm run modules:search <keyword>
```

Use the `path` from search results as the `module` in your YAML plan.

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
