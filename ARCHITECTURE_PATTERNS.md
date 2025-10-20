# Architecture Patterns for Async Workflows

This document explores different architectural patterns for organizing async workflows, from basic to advanced. Your current Social Cat architecture is analyzed and compared.

## Current Social Cat Architecture (Level 3/5)

### What You Have Now
```typescript
// API Modules
src/lib/twitter.ts          → export async function replyToTweet()
src/lib/openai.ts           → export async function generateTweetReply()
src/lib/rapidapi/twitter/   → export async function searchTwitter()

// Workflows
src/lib/workflows/twitter/reply-to-tweets.ts
  → imports functions above
  → orchestrates with Pipeline pattern
  → returns result

// Jobs
src/lib/jobs/twitter-reply.ts
  → imports workflow
  → executes on schedule
```

**Strengths:**
✅ Clear separation of concerns
✅ Easy to understand and maintain
✅ Functions are reusable across workflows
✅ Type-safe with TypeScript
✅ Testable (can mock individual functions)

**Weaknesses:**
⚠️ Hardcoded dependencies (difficult to swap implementations)
⚠️ No explicit contracts/interfaces
⚠️ Side effects mixed with business logic (logging inside functions)
⚠️ Difficult to unit test without mocking modules

---

## Level 1: Basic Async Functions (❌ Not Recommended)

**Anti-pattern: Everything in one file**

```typescript
// ❌ BAD: All logic in one massive file
async function replyToTweets() {
  // Search tweets
  const response = await axios.get('twitter-api...');
  const tweets = response.data;

  // Select tweet
  const selected = tweets[0];

  // Generate reply
  const aiResponse = await axios.post('openai-api...');
  const reply = aiResponse.data;

  // Post reply
  await axios.post('twitter-api/reply...', { reply });
}
```

**Problems:**
- Can't reuse any part of this logic
- Hard to test (need to mock axios globally)
- No error handling
- No type safety
- Mixed concerns (API calls + business logic)

---

## Level 2: Basic Module Separation (⚠️ Minimal)

**Better: Separate API clients**

```typescript
// twitter.ts
export async function replyToTweet(id: string, text: string) {
  return axios.post(`/tweets/${id}/reply`, { text });
}

// workflow.ts
import { replyToTweet } from './twitter';

async function replyWorkflow() {
  const reply = 'Hello';
  await replyToTweet('123', reply);
}
```

**Improvements:**
✅ Reusable functions
✅ Easier to test

**Still Missing:**
⚠️ No error handling
⚠️ Hardcoded dependencies
⚠️ No abstraction

---

## Level 3: Your Current Pattern (✅ Good for Most Projects)

**What you have: Module separation + Pipeline + Reliability**

```typescript
// twitter.ts - Wrapped with resilience
export const replyToTweet = withRateLimit(
  createCircuitBreaker(async (id, text) => {
    logger.info({ id }, 'Replying to tweet');
    const result = await twitterClient.reply(text, id);
    return result;
  }),
  rateLimiter
);

// workflow.ts - Pipeline orchestration
export async function replyToTweetsWorkflow(config) {
  return createPipeline()
    .step('search', async (ctx) => {
      const tweets = await searchTwitter(ctx.query);
      return { ...ctx, tweets };
    })
    .step('select', async (ctx) => {
      const selected = selectBestTweet(ctx.tweets);
      return { ...ctx, selected };
    })
    .step('generate', async (ctx) => {
      const reply = await generateReply(ctx.selected.text);
      return { ...ctx, reply };
    })
    .step('post', async (ctx) => {
      const result = await replyToTweet(ctx.selected.id, ctx.reply);
      return { ...ctx, result };
    })
    .execute(initialContext);
}
```

**Strengths:**
✅ Clean separation (API / Workflow / Jobs)
✅ Pipeline makes workflow readable
✅ Reliability built-in (retries, circuit breakers)
✅ Structured logging
✅ Type-safe context passing

**Where it could improve:**
⚠️ Functions are tightly coupled to implementations
⚠️ Hard to swap Twitter client (e.g., test with mock, prod with real)
⚠️ Side effects (logging) inside reusable functions
⚠️ No explicit interface contracts

**Verdict:** This is **perfect for 80% of projects**. Don't over-engineer!

---

## Level 4: Dependency Injection (⭐ Better for Testing)

**Pattern: Pass dependencies as parameters**

```typescript
// Define interfaces
interface TwitterClient {
  replyToTweet(id: string, text: string): Promise<ReplyResult>;
}

interface AIClient {
  generateReply(text: string): Promise<string>;
}

// Workflow accepts dependencies
export async function replyToTweetsWorkflow(
  config: WorkflowConfig,
  deps: {
    twitter: TwitterClient;
    ai: AIClient;
    search: (query: string) => Promise<Tweet[]>;
  }
) {
  return createPipeline()
    .step('search', async (ctx) => {
      const tweets = await deps.search(ctx.query);
      return { ...ctx, tweets };
    })
    .step('generate', async (ctx) => {
      const reply = await deps.ai.generateReply(ctx.selected.text);
      return { ...ctx, reply };
    })
    .step('post', async (ctx) => {
      const result = await deps.twitter.replyToTweet(ctx.selected.id, ctx.reply);
      return { ...ctx, result };
    })
    .execute(initialContext);
}

// Usage in production
await replyToTweetsWorkflow(config, {
  twitter: realTwitterClient,
  ai: realAIClient,
  search: realSearchFunction,
});

// Usage in tests
await replyToTweetsWorkflow(config, {
  twitter: mockTwitterClient,  // Easy to mock!
  ai: mockAIClient,
  search: () => Promise.resolve([mockTweet]),
});
```

**Benefits:**
✅ Easy to test (just pass mocks)
✅ Explicit dependencies (clear what workflow needs)
✅ Can swap implementations easily
✅ No import mocking needed

**Trade-offs:**
⚠️ More verbose
⚠️ Need to wire dependencies at call site
⚠️ Can get messy with many dependencies

**When to use:** When you have extensive unit tests or multiple implementations (e.g., dev/staging/prod clients).

---

## Level 5: Full Dependency Injection Container (🚀 Enterprise)

**Pattern: IoC Container with auto-wiring**

```typescript
// Define services with decorators
@injectable()
class TwitterService {
  constructor(
    @inject('logger') private logger: Logger,
    @inject('rateLimiter') private limiter: RateLimiter
  ) {}

  async replyToTweet(id: string, text: string) {
    return this.limiter.schedule(async () => {
      this.logger.info({ id }, 'Replying');
      return await this.client.reply(text, id);
    });
  }
}

@injectable()
class ReplyWorkflow {
  constructor(
    @inject('twitterService') private twitter: TwitterService,
    @inject('aiService') private ai: AIService,
    @inject('searchService') private search: SearchService
  ) {}

  async execute(config: WorkflowConfig) {
    // Dependencies auto-injected
    const tweets = await this.search.searchTwitter(config.query);
    const reply = await this.ai.generateReply(tweets[0].text);
    return await this.twitter.replyToTweet(tweets[0].id, reply);
  }
}

// Container setup
const container = new Container();
container.bind('twitterService').to(TwitterService);
container.bind('aiService').to(AIService);
container.bind('replyWorkflow').to(ReplyWorkflow);

// Usage
const workflow = container.get<ReplyWorkflow>('replyWorkflow');
await workflow.execute(config);
```

**Benefits:**
✅ Auto-wiring of dependencies
✅ Lifetime management (singleton, transient, scoped)
✅ Easy to swap implementations
✅ Very testable
✅ Enterprise-grade

**Trade-offs:**
⚠️ Significant complexity
⚠️ Learning curve (decorators, IoC concepts)
⚠️ Overkill for small projects
⚠️ Runtime overhead

**When to use:** Large teams, many services, complex dependency graphs (like NestJS framework uses).

---

## Alternative Pattern: Functional Core, Imperative Shell

**Pattern: Pure functions + thin wrapper**

```typescript
// ✅ Pure business logic (no side effects)
export function selectBestTweet(tweets: Tweet[]): Tweet | null {
  // Pure function - no API calls, no logging, just logic
  const scored = tweets.map(t => ({
    tweet: t,
    score: calculateEngagementScore(t),
  }));
  return scored.sort((a, b) => b.score - a.score)[0]?.tweet || null;
}

export function calculateEngagementScore(tweet: Tweet): number {
  // Pure function
  return (tweet.likes || 0) + (tweet.retweets || 0) * 2;
}

// ⚠️ Imperative shell (side effects here)
export async function replyToTweetsWorkflow(config) {
  // Side effects isolated to workflow orchestration
  const tweets = await searchTwitter(config.query);  // Side effect
  const selected = selectBestTweet(tweets);          // Pure
  const reply = await generateReply(selected.text);  // Side effect
  await replyToTweet(selected.id, reply);            // Side effect
  logger.info({ id: selected.id }, 'Complete');      // Side effect
}
```

**Benefits:**
✅ Core logic is pure (easy to test without mocks)
✅ Side effects explicit and isolated
✅ Functions are truly reusable
✅ Easier to reason about

**Your Code Already Does This Well:**
```typescript
// ✅ You already have pure functions:
function calculateEngagementScore(tweet: Tweet): number {
  // No side effects - perfect!
}

function selectBestTweet(tweets: Tweet[]): Tweet | null {
  // No side effects - perfect!
}
```

---

## Comparison Matrix

| Pattern | Complexity | Testability | Flexibility | Your Use Case |
|---------|-----------|-------------|-------------|---------------|
| **Level 1: Monolith** | ⭐ | ⭐ | ⭐ | ❌ Too basic |
| **Level 2: Basic Modules** | ⭐⭐ | ⭐⭐ | ⭐⭐ | ❌ Missing features |
| **Level 3: Your Current** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ **Perfect!** |
| **Level 4: DI Parameters** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🤔 Only if testing heavily |
| **Level 5: IoC Container** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ Overkill |

---

## Recommendations for Your Project

### ✅ Keep What You Have (Level 3)

Your current architecture is **excellent** for:
- Single-user application
- Team of 1-3 developers
- Rapid iteration
- Clear business logic
- Good enough testability

**Don't change just to change.**

### 🔧 Minor Improvements You Could Make

#### 1. Extract Pure Functions More
```typescript
// ✅ GOOD: Already doing this
function calculateEngagementScore(tweet: Tweet): number { ... }
function selectBestTweet(tweets: Tweet[]): Tweet | null { ... }

// 🔧 ADD MORE: Extract tweet filtering
function filterTweetsWithoutMedia(tweets: Tweet[]): Tweet[] {
  return tweets.filter(t => !t.media || t.media.length === 0);
}

function filterTweetsWithoutLinks(tweets: Tweet[]): Tweet[] {
  return tweets.filter(t => !t.text.match(/https?:\/\//));
}
```

#### 2. Define Explicit Types for Function Contracts
```typescript
// Add interfaces for clarity
export interface TweetSearchParams {
  query: string;
  count: number;
  removeMedia?: boolean;
  removeLinks?: boolean;
}

export interface TweetSearchResult {
  tweets: Tweet[];
  nextCursor?: string;
}

// Makes function signature clearer
export async function searchTwitter(
  params: TweetSearchParams
): Promise<TweetSearchResult> {
  // ...
}
```

#### 3. Consider Dependency Injection for Testing (Optional)
Only if you're writing lots of unit tests:

```typescript
// Create a factory function
export function createReplyWorkflow(deps?: {
  searchTwitter?: typeof searchTwitter;
  generateReply?: typeof generateTweetReply;
  replyToTweet?: typeof replyToTweet;
}) {
  const search = deps?.searchTwitter ?? searchTwitter;
  const generate = deps?.generateReply ?? generateTweetReply;
  const reply = deps?.replyToTweet ?? replyToTweet;

  return async function(config: WorkflowConfig) {
    // Use injected dependencies
    const tweets = await search({ query: config.query });
    // ... rest of workflow
  };
}

// Production: uses real implementations
const workflow = createReplyWorkflow();

// Tests: uses mocks
const mockWorkflow = createReplyWorkflow({
  searchTwitter: async () => ({ tweets: [mockTweet] }),
  generateReply: async () => 'Mock reply',
  replyToTweet: async () => ({ id: 'mock' }),
});
```

---

## Real-World Examples

### Your Pattern is Used By:
- **Vercel's Edge Functions** - Similar module separation
- **AWS Lambda Handlers** - Import and compose functions
- **Temporal Workflows** - Step-based orchestration
- **GitHub Actions Workflows** - Sequential steps with context

### Dependency Injection is Used By:
- **NestJS** (IoC container)
- **Angular** (IoC container)
- **Spring Boot** (IoC container)
- **ASP.NET Core** (DI framework)

### Your Choice: **You're in good company!**

---

## Final Verdict

### Your Current Architecture: **8.5/10** ⭐

**Strengths:**
1. ✅ Clean module separation
2. ✅ Reusable functions
3. ✅ Pipeline pattern for workflows
4. ✅ Reliability infrastructure (retries, circuit breakers, rate limiting)
5. ✅ Structured logging
6. ✅ Type-safe
7. ✅ Easy to understand and maintain
8. ✅ Good balance of complexity vs. benefit

**Minor Improvements Possible:**
1. 🔧 Extract more pure functions for business logic
2. 🔧 Add explicit interface contracts (optional)
3. 🔧 Consider dependency injection only if extensive testing (optional)

**Bottom Line:**
> **"Perfect is the enemy of good."** - Voltaire

Your architecture is **production-ready, maintainable, and appropriate for your scale**. Don't over-engineer it! Focus on shipping features, not refactoring for abstract "ideal" patterns.

---

## When to Level Up

Consider moving to Level 4 (Dependency Injection) if:
- ❓ You need extensive unit testing (>70% coverage required)
- ❓ You have multiple environments with different implementations
- ❓ Your team grows to 5+ developers
- ❓ You need to mock services frequently in tests

Consider Level 5 (IoC Container) if:
- ❓ You have 20+ services with complex dependencies
- ❓ You need lifecycle management (singleton, scoped, transient)
- ❓ You're building a framework or platform
- ❓ You have enterprise compliance requirements

**For Social Cat: Stay at Level 3.** 🎯
