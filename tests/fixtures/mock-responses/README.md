# Mock API Responses

Store mock API responses here for use in tests.

## Structure

```
mock-responses/
  ├── twitter/
  │   ├── tweet.json
  │   ├── search-results.json
  │   └── user-profile.json
  ├── slack/
  │   ├── send-message.json
  │   └── channel-list.json
  ├── openai/
  │   ├── completion.json
  │   └── embedding.json
  └── ...
```

## Usage

```typescript
import tweetResponse from '@/tests/fixtures/mock-responses/twitter/tweet.json';

vi.mock('twitter-api-v2', () => ({
  TwitterApi: vi.fn().mockImplementation(() => ({
    v2: {
      tweet: vi.fn().mockResolvedValue(tweetResponse),
    },
  })),
}));
```
