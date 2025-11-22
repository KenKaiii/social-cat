# Manual Trigger Reference

## Available Variables

Manual triggers provide NO trigger data - workflows start when user clicks "Run" button.

## Configuration

```yaml
trigger: manual
# No configuration needed
```

## Complete Working Example

```yaml
name: Data Analysis
description: Analyze data when run manually
trigger: manual
output: table
steps:
  # Set up test data
  - module: utilities.javascript.evaluateExpression
    id: setup-data
    inputs:
      expression: "([{id: 1, value: 100}, {id: 2, value: 200}])"
    outputAs: data

  # Process data
  - module: utilities.array-utils.sum
    id: calculate-total
    inputs:
      arr: "{{data}}"
    outputAs: total
```

## Critical Rules

1. NO trigger variables
2. Use `evaluateExpression` for initial data
3. Good for: testing, one-off tasks, on-demand processing
