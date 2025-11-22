# Webhook Trigger Reference

## Available Variables

Webhook triggers provide a `trigger` object with:

- **`trigger.body`** - JSON request body (POST data)
  - Access fields: `trigger.body.email`, `trigger.body.numbers`, etc.
  - CRITICAL: ALWAYS use `trigger.body.X`, NEVER `webhookData.X` or `input.X`

- **`trigger.headers`** - HTTP headers object
  - Example: `trigger.headers['user-agent']`

- **`trigger.query`** - URL query parameters
  - Example: `trigger.query.apiKey`

- **`trigger.method`** - HTTP method (usually "POST")

- **`trigger.url`** - Request URL path

## Configuration Options

```yaml
trigger: webhook
webhookSync: true          # REQUIRED if user wants response data back
# webhookSecret: "key"     # Optional/ADVANCED - requires HMAC signature header (skip for testing)
```

**Sync Mode:**
- `webhookSync: false` (default) - Returns `{"queued": true}` immediately
- `webhookSync: true` - Executes workflow, waits, returns actual output

## Complete Working Example

```yaml
name: Webhook Calculator
description: Adds numbers from webhook POST data
trigger: webhook
webhookSync: true          # User gets results back
output: json
returnValue: "{{result}}"  # Return only the result variable
steps:
  # Step 1: Extract and process numbers from webhook
  - module: utilities.javascript.execute
    id: calculate
    inputs:
      code: |
        // Access webhook POST data with trigger.body
        const numbers = trigger.body.numbers || [];
        const sum = numbers.reduce((a, b) => a + b, 0);
        return {
          input: numbers,
          sum: sum,
          average: sum / numbers.length,
          count: numbers.length
        };
    outputAs: result

# Usage:
# POST http://localhost:3123/api/workflows/{id}/webhook
# Body: {"numbers": [1, 2, 3, 4, 5]}
# Response: {"input": [1,2,3,4,5], "sum": 15, "average": 3, "count": 5}
```

## Common Patterns

### Pattern 1: Access POST Data
```yaml
steps:
  - module: utilities.javascript.execute
    id: process-data
    inputs:
      code: |
        const email = trigger.body.email;  # CORRECT
        const age = trigger.body.age;      # CORRECT
        # NOT: webhookData.email           # WRONG
        # NOT: input.email                 # WRONG
        return {validated: true};
```

### Pattern 2: Validation
```yaml
steps:
  - module: utilities.javascript.execute
    id: validate
    inputs:
      code: |
        const errors = [];
        if (!trigger.body.email?.includes('@')) {
          errors.push('Invalid email');
        }
        return {
          valid: errors.length === 0,
          errors: errors
        };
    outputAs: validation
```

### Pattern 3: Multi-Step with ReturnValue
```yaml
returnValue: "{{finalOutput}}"  # Only return this variable
steps:
  - module: utilities.javascript.execute
    id: step1
    inputs:
      code: "return {data: trigger.body};"
    outputAs: processedData  # Not returned (intermediate)

  - module: utilities.javascript.execute
    id: step2
    inputs:
      code: "return {result: processedData.data.value * 2};"
      context:
        processedData: "{{processedData}}"
    outputAs: finalOutput  # This gets returned due to returnValue
```

## Critical Rules for Webhooks

1. **ALWAYS use `trigger.body.fieldName`** to access POST data
2. **ALWAYS set `webhookSync: true`** if user wants to see results
3. **ALWAYS set `returnValue`** to control what gets returned
4. **NEVER use** `webhookData`, `input`, `request.body`, or `data` - only `trigger.body`
5. **Test with**: `curl -X POST /api/workflows/{id}/webhook -d '{"field": "value"}'`

## What NOT to Do

❌ `webhookData.numbers` - Variable doesn't exist
❌ `input.email` - Variable doesn't exist
❌ `request.body.age` - Variable doesn't exist
❌ Forgetting `webhookSync: true` - User won't get results back
❌ No `returnValue` - Returns everything including credentials (security issue)

✅ `trigger.body.numbers` - Correct
✅ `trigger.body.email` - Correct
✅ `webhookSync: true` - Returns output
✅ `returnValue: "{{result}}"` - Controls output

## Security

- Webhooks require NO authentication (public endpoints)
- Optional HMAC verification via `webhookSecret`
- Rate limited: 3 requests per minute per IP
- Credentials automatically filtered from output
- Use `returnValue` to explicitly control what data is returned
