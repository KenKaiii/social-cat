# Common Mistakes & How to Avoid Them

## Critical Gotchas

### 1. Rest Parameters (Spread Operator)

❌ **Problem:** Some modules use `...param` which doesn't work in workflows

**Affected modules:**
- `utilities.math.max(...numbers)` ← Expects individual arguments
- `utilities.math.min(...numbers)`
- `utilities.array-utils.intersection(...arrays)`
- `utilities.array-utils.union(...arrays)`
- `utilities.json-transform.deepMerge(...objects)`

✅ **Solution:** Use array-utils versions

```yaml
# ❌ WRONG - uses rest parameters:
- module: utilities.math.max
  inputs:
    numbers: [1, 2, 3]  # Won't work!

# ✅ CORRECT - takes array:
- module: utilities.array-utils.max
  inputs:
    arr: [1, 2, 3]      # Works!
```

### 2. JavaScript Context Limitations

❌ **Problem:** `filterArray/mapArray` only provide `{item, index, items}`, no custom context

```yaml
# ❌ WRONG - threshold undefined:
- module: utilities.javascript.filterArray
  inputs:
    items: "{{data}}"
    code: "return item > threshold"  # threshold not available!
```

✅ **Solution:** Use `javascript.execute` for custom context

```yaml
# ✅ CORRECT:
- module: utilities.javascript.execute
  inputs:
    code: "return data.filter(x => x > threshold)"
    context:
      data: "{{data}}"
      threshold: 50
```

### 3. Table Output Structure

❌ **Problem:** Table output needs array of objects, not complex nested structures

```yaml
# ❌ WRONG - returns complex object:
returnValue: "{{complexObject}}"
# Where complexObject = {posts: [...], meta: {...}}
```

✅ **Solution:** Point returnValue to the array

```yaml
# ✅ CORRECT - returns just the array:
returnValue: "{{complexObject.posts}}"
```

### 4. Trigger Variable Names

❌ **WRONG variable names:**
- `webhookData.field` - doesn't exist
- `input.field` - doesn't exist
- `request.body.field` - doesn't exist
- `data.field` - too generic

✅ **CORRECT:**
- `trigger.body.field` - for webhooks
- `trigger.message` - for chat/telegram/discord
- `trigger.userInput` - for chat triggers

### 5. Missing ReturnValue

❌ **Problem:** No returnValue = returns EVERYTHING including credentials

```yaml
# ❌ DANGEROUS:
steps:
  - ...
# No returnValue specified
# Result: Returns all variables including API keys!
```

✅ **Solution:** Always specify returnValue for webhooks

```yaml
# ✅ SAFE:
returnValue: "{{result}}"
steps:
  - id: process
    outputAs: result
```

### 6. YAML String vs Array/Object

❌ **WRONG - strings instead of actual types:**
```yaml
inputs:
  numbers: "[1, 2, 3]"    # This is a STRING
  config: "{key: value}"  # This is a STRING
```

✅ **CORRECT - actual YAML types:**
```yaml
inputs:
  numbers: [1, 2, 3]      # Actual array
  config:                 # Actual object
    key: value
```

### 7. Multi-line Strings

❌ **WRONG:**
```yaml
code: "return {value: 123}; // Multiple lines don't work like this
  const x = 456;"
```

✅ **CORRECT - use | for multi-line:**
```yaml
code: |
  const x = 456;
  return {value: x * 2};
```

### 8. Module Path Typos

❌ **WRONG - guessing module paths:**
```yaml
module: utilities.arrays.sum       # Wrong: it's "array-utils" not "arrays"
module: utilities.javascript.eval  # Wrong: it's "execute" not "eval"
module: social.twitter.search      # Wrong: it's "searchTweets" not "search"
```

✅ **CORRECT - always search first:**
```bash
curl "http://localhost:3123/api/modules/search?q=sum&limit=5"
# Use exact path from results: utilities.array-utils.sum
```

### 9. Webhook Sync Not Set

❌ **Problem:** User wants response but no sync flag

```yaml
trigger: webhook
# Missing: webhookSync: true
# Result: Returns {"queued": true}, user never sees workflow output
```

✅ **Solution:**
```yaml
trigger: webhook
webhookSync: true  # Now returns actual workflow output
```

### 10. Empty/Missing Inputs

❌ **WRONG:**
```yaml
- module: utilities.javascript.execute
  # Missing inputs - will fail!
```

✅ **CORRECT - always include inputs:**
```yaml
- module: utilities.javascript.execute
  inputs: {}  # At minimum, empty object
```

Or better:
```yaml
- module: utilities.javascript.execute
  inputs:
    code: "return {value: 123};"
```

## Validation Error Quick Fixes

**Error: "Module not found"**
→ Use module search, check spelling, use exact path

**Error: "trigger is not defined"**
→ Using wrong trigger variables (webhookData vs trigger.body)

**Error: "Variable {{x}} not found"**
→ Check outputAs name, ensure step runs before reference

**Error: "Invalid YAML"**
→ Check quotes, multi-line strings (use |), array/object syntax

**Error: "Rest parameters not supported"**
→ Use array-utils version instead of math version

## Best Practices

1. **Always search** for module paths - don't guess
2. **Always set returnValue** - especially for webhooks
3. **Always quote** variable references: `"{{var}}"`
4. **Use |** for multi-line strings
5. **Test incrementally** - start simple, add complexity
6. **Check signatures** - module search shows exact parameter names
