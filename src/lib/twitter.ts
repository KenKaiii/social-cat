import { TwitterApi } from 'twitter-api-v2';
import { createTwitterCircuitBreaker } from './resilience';
import { twitterUserRateLimiter, withRateLimit } from './rate-limiter';
import { logger } from './logger';

/**
 * Twitter API Client with Reliability Infrastructure
 *
 * Features:
 * - Circuit breaker to prevent hammering failing API
 * - Rate limiting for user-level operations (50 actions/hour)
 * - Structured logging
 * - Automatic error handling
 */

// Check if Twitter credentials are set
const hasTwitterCredentials =
  process.env.TWITTER_API_KEY &&
  process.env.TWITTER_API_SECRET &&
  process.env.TWITTER_ACCESS_TOKEN &&
  process.env.TWITTER_ACCESS_SECRET;

if (!hasTwitterCredentials) {
  logger.warn('⚠️  Twitter API credentials are not fully set. Twitter features will not work.');
}

// Initialize Twitter client
export const twitterClient = hasTwitterCredentials
  ? new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    })
  : null;

/**
 * Create a new tweet (internal, unprotected)
 */
async function createTweetInternal(text: string) {
  if (!twitterClient) {
    throw new Error('Twitter client is not initialized. Please set Twitter API credentials.');
  }

  logger.info({ textLength: text.length }, 'Creating tweet');
  const tweet = await twitterClient.v2.tweet(text);
  logger.info({ tweetId: tweet.data.id }, 'Tweet created successfully');
  return tweet.data;
}

/**
 * Create a new tweet (protected with circuit breaker + rate limiting)
 */
const createTweetWithBreaker = createTwitterCircuitBreaker(createTweetInternal);
export const createTweet = withRateLimit(
  (text: string) => createTweetWithBreaker.fire(text),
  twitterUserRateLimiter
);

// Alias for backwards compatibility
export const postTweet = createTweet;

/**
 * Reply to a specific tweet (internal, unprotected)
 */
async function replyToTweetInternal(tweetId: string, text: string) {
  if (!twitterClient) {
    throw new Error('Twitter client is not initialized. Please set Twitter API credentials.');
  }

  logger.info({ tweetId, textLength: text.length }, 'Replying to tweet');
  const reply = await twitterClient.v2.reply(text, tweetId);
  logger.info({ tweetId, replyId: reply.data.id }, 'Reply posted successfully');
  return reply.data;
}

/**
 * Reply to a specific tweet (protected with circuit breaker + rate limiting)
 */
const replyToTweetWithBreaker = createTwitterCircuitBreaker(replyToTweetInternal);
export const replyToTweet = withRateLimit(
  (tweetId: string, text: string) => replyToTweetWithBreaker.fire(tweetId, text),
  twitterUserRateLimiter
);

// Helper function to get user timeline (internal)
async function getUserTimelineInternal(userId: string, maxResults = 10) {
  if (!twitterClient) {
    throw new Error('Twitter client is not initialized. Please set Twitter API credentials.');
  }

  logger.info({ userId, maxResults }, 'Fetching user timeline');
  const timeline = await twitterClient.v2.userTimeline(userId, {
    max_results: maxResults,
  });
  logger.info({ userId, tweetsCount: timeline.data.data?.length || 0 }, 'Timeline fetched');
  return timeline;
}

/**
 * Get user timeline (protected with circuit breaker)
 */
const getUserTimelineWithBreaker = createTwitterCircuitBreaker(getUserTimelineInternal);
export const getUserTimeline = (userId: string, maxResults = 10) =>
  getUserTimelineWithBreaker.fire(userId, maxResults);

// Helper function to search tweets (internal)
async function searchTweetsInternal(query: string, maxResults = 10) {
  if (!twitterClient) {
    throw new Error('Twitter client is not initialized. Please set Twitter API credentials.');
  }

  logger.info({ query, maxResults }, 'Searching tweets');
  const search = await twitterClient.v2.search(query, {
    max_results: maxResults,
  });
  logger.info({ query, resultsCount: search.data.data?.length || 0 }, 'Search completed');
  return search;
}

/**
 * Search tweets (protected with circuit breaker)
 */
const searchTweetsWithBreaker = createTwitterCircuitBreaker(searchTweetsInternal);
export const searchTweets = (query: string, maxResults = 10) =>
  searchTweetsWithBreaker.fire(query, maxResults);
