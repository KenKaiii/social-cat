# YAML Plan Format Specification

## Complete YAML Structure

```yaml
# REQUIRED FIELDS
name: Workflow Name                    # String, 1-100 chars
description: Brief description         # String, optional but recommended
trigger: webhook                       # Enum: manual|cron|webhook|chat|telegram|discord
output: json                          # Enum: json|table|list|text|markdown|image|images|chart

# OPTIONAL FIELDS
webhookSync: true                     # Boolean - for webhook triggers only (enables sync response)
# webhookSecret: "key"                # String - ADVANCED: enables HMAC verification (requires signature header)
returnValue: "{{variableName}}"       # String - what to return (defaults to last step's outputAs)
outputColumns: [col1, col2]           # Array - for table/list output only
category: category-name               # String - for organization
tags: [tag1, tag2]                    # Array - for filtering
timeout: 300000                       # Number - milliseconds (default: 300000 = 5min)
retries: 0                            # Number - retry attempts (default: 0)

# REQUIRED: STEPS ARRAY
steps:
  - module: category.module.function  # REQUIRED - exact path from module search
    id: unique-step-id                # REQUIRED - alphanumeric, dashes, underscores
    name: Human Readable Name         # Optional - displayed in UI
    inputs:                           # REQUIRED - can be {} for no-param modules
      param1: "{{variable}}"          # Use {{}} for variable interpolation
      param2: hardcoded-value         # Or literal values
    outputAs: variableName            # Optional - store step result for later use
```

## Variable Interpolation Rules

**Reference previous step outputs:**
```yaml
outputAs: myData                    # Step 1 stores result as "myData"
---
inputs:
  field: "{{myData}}"                # Step 2 uses entire myData
  nested: "{{myData.property}}"     # Access nested property
  array: "{{myData.items[0]}}"      # Access array element
```

**CRITICAL RULES:**
- ✅ Always use double quotes: `"{{variable}}"`
- ✅ Can reference any previous step's `outputAs`
- ✅ Can access trigger variables: `"{{trigger.body.field}}"`
- ❌ Cannot reference steps that haven't run yet
- ❌ Cannot use JavaScript expressions inside {{}} - use utilities.javascript.execute instead

## Output Formats

**json** - Raw JSON object
```yaml
output: json
# Returns: whatever the returnValue resolves to
```

**table** - Structured data table
```yaml
output: table
outputColumns: [id, name, status]  # Optional - auto-inferred if not specified
# Returns: array of objects, displayed as table in UI
```

**text** - Plain text
```yaml
output: text
# Returns: string value, displayed as plain text
```

**markdown** - Formatted markdown
```yaml
output: markdown
# Returns: string with markdown syntax, rendered in UI
```

## ReturnValue Specification

**If NOT specified:**
- Defaults to last step's `outputAs` value
- Auto-filters out credentials and internal variables

**If specified:**
```yaml
returnValue: "{{result}}"           # Returns only this variable
returnValue: "{{result.data}}"      # Returns nested property
returnValue: "{{result.items[0]}}"  # Returns array element
```

**CRITICAL:**
- Variable MUST exist (produced by a step's `outputAs`)
- Use for security: explicitly control what data is returned
- Essential for webhooks: prevents credential leakage

## Common YAML Mistakes

❌ **Wrong:**
```yaml
inputs:
  code: return {value: 123};  # Missing quotes, invalid YAML
```

✅ **Correct:**
```yaml
inputs:
  code: |                     # Use | for multi-line strings
    return {value: 123};
```

❌ **Wrong:**
```yaml
inputs:
  data: {{variable}}          # Missing quotes
```

✅ **Correct:**
```yaml
inputs:
  data: "{{variable}}"        # Always quote variables
```

❌ **Wrong:**
```yaml
inputs:
  numbers: "[1, 2, 3]"        # This is a STRING, not an array
```

✅ **Correct:**
```yaml
inputs:
  numbers: [1, 2, 3]          # Actual YAML array
```

## Step Execution Order

Steps run **sequentially** in the order defined:

```yaml
steps:
  - id: step1                 # Runs first
    outputAs: data1
  - id: step2                 # Runs second, can use {{data1}}
    outputAs: data2
  - id: step3                 # Runs third, can use {{data1}} or {{data2}}
    outputAs: result
```

## Module Input Wrapping (Auto-Handled)

Some modules use "wrapper" functions - build script handles this automatically:

**Wrapper modules** (inputs auto-wrapped in `options: {}` or `params: {}`):
- `ai.ai-sdk.*` - Wrapped in `options: {}`
- `utilities.javascript.*` - Wrapped in `options: {}`
- `data.drizzle-utils.*` - Wrapped in `params: {}`

**Direct modules** (no wrapping):
- `utilities.math.*`
- `utilities.array-utils.*`
- `utilities.string-utils.*`
- All others

**You just write inputs normally - wrapping is automatic!**

```yaml
# You write this:
- module: ai.ai-sdk.generateText
  inputs:
    prompt: "Hello"
    model: gpt-4o-mini

# Build script converts to:
  inputs:
    options:
      prompt: "Hello"
      model: gpt-4o-mini
```

## Complete Minimal Example

```yaml
name: Test Workflow
trigger: manual
output: json
steps:
  - module: utilities.javascript.execute
    id: create-data
    inputs:
      code: "return {message: 'Hello'};"
    outputAs: result
```

This is the absolute minimum working workflow.
