# Cron Trigger Reference

## Available Variables

Cron triggers provide NO trigger data - workflows start with hardcoded values or configuration.

Use `utilities.javascript.evaluateExpression` to set up initial data.

## Configuration

```yaml
trigger: cron
# Schedule is set in UI after import (default: every hour)
```

## Complete Working Example

```yaml
name: Daily Twitter Monitor
description: Search Twitter and reply to tweets every hour
trigger: cron
output: table
steps:
  # Step 1: Set up search query (no trigger data available)
  - module: utilities.javascript.evaluateExpression
    id: setup-query
    inputs:
      expression: "({query: 'AI automation', maxResults: 10})"
    outputAs: searchConfig

  # Step 2: Search Twitter
  - module: social.twitter.searchTweets
    id: search
    inputs:
      query: "{{searchConfig.query}}"
      maxResults: "{{searchConfig.maxResults}}"
    outputAs: tweets

  # Step 3: Process results
  - module: utilities.array-utils.first
    id: get-latest
    inputs:
      arr: "{{tweets}}"
      count: 5
    outputAs: latestTweets
```

## Critical Rules

1. NO trigger variables available
2. Use `evaluateExpression` to create initial data
3. Schedule configured in UI after import
4. Good for: periodic checks, scheduled reports, automated posts
