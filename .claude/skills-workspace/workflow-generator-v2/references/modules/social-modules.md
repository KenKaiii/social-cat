# Social Media Modules Reference

## Available Platforms

Search with:
- `curl "http://localhost:3123/api/modules/search?q=twitter&limit=5"`
- `curl "http://localhost:3123/api/modules/search?q=linkedin&limit=5"`
- `curl "http://localhost:3123/api/modules/search?q=reddit&limit=5"`
- `curl "http://localhost:3123/api/modules/search?q=youtube&limit=5"`

## Twitter (Requires OAuth)

**Search tweets:**
```yaml
- module: social.twitter.searchTweets
  id: search
  inputs:
    query: "AI automation"
    maxResults: 10
```

**Reply to tweet:**
```yaml
- module: social.twitter.replyToTweet
  id: reply
  inputs:
    tweetId: "{{tweetId}}"
    text: "{{replyText}}"
```

## LinkedIn

Search with: `curl "http://localhost:3123/api/modules/search?q=linkedin&limit=5"`

## Reddit

Search with: `curl "http://localhost:3123/api/modules/search?q=reddit&limit=5"`

**Common pattern:**
```yaml
- module: social.reddit.search
  id: search
  inputs:
    query: "topic"
    limit: 10
```

## YouTube

Search with: `curl "http://localhost:3123/api/modules/search?q=youtube&limit=5"`

## Credentials

Social modules require OAuth tokens. Search for the specific module to see credential requirements.

## Deduplication Pattern (Important!)

For scheduled social workflows, use storage to avoid duplicates:

```yaml
steps:
  # 1. Search for content
  - module: social.twitter.searchTweets
    id: search
    inputs:
      query: "topic"
    outputAs: tweets

  # 2. Extract IDs
  - module: utilities.array-utils.pluck
    id: get-ids
    inputs:
      arr: "{{tweets}}"
      key: id
    outputAs: tweetIds

  # 3. Check which we've already processed
  - module: data.drizzle-utils.queryWhereIn
    id: check-processed
    inputs:
      workflowId: "{{workflowId}}"
      tableName: processed_tweets
      column: tweet_id
      values: "{{tweetIds}}"
    outputAs: processedIds

  # 4. Filter out already processed
  - module: utilities.javascript.execute
    id: filter-new
    inputs:
      code: "return tweets.filter(t => !processed.includes(t.id));"
      context:
        tweets: "{{tweets}}"
        processed: "{{processedIds}}"
    outputAs: newTweets

  # 5. Process new tweets...

  # 6. Store as processed
  - module: data.drizzle-utils.insertRecord
    id: mark-processed
    inputs:
      workflowId: "{{workflowId}}"
      tableName: processed_tweets
      data:
        tweet_id: "{{processedTweetId}}"
      ttl: 2592000  # 30 days
```
