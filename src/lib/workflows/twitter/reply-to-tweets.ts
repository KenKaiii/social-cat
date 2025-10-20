import { createPipeline } from '../Pipeline';
import { searchTwitter, type Tweet } from '@/lib/rapidapi/twitter';
import { replyToTweet } from '@/lib/twitter';
import { generateTweetReply } from '@/lib/openai';
import { logger } from '@/lib/logger';

/**
 * Reply to Tweets Workflow
 *
 * Production-ready with:
 * - Automatic retries (RapidAPI: 4 attempts, Twitter/OpenAI: 3 attempts)
 * - Circuit breakers to prevent hammering failing APIs
 * - Rate limiting (Twitter: 50 actions/hour, OpenAI: 500 req/min)
 * - Structured logging to logs/app.log
 *
 * Steps:
 * 1. Search for tweets matching criteria (from today, no links/media)
 * 2. Rank by engagement and select hottest + newest
 * 3. Generate AI response
 * 4. Post reply to selected tweet
 */

interface WorkflowContext {
  searchQuery: string;
  systemPrompt?: string;
  tweets: Tweet[];
  selectedTweet?: Tweet;
  generatedReply: string;
  replyResult?: unknown;
}

interface WorkflowConfig {
  searchQuery: string;
  systemPrompt?: string;
  dryRun?: boolean; // If true, skip posting to Twitter
  searchParams?: {
    minimumLikesCount?: number;
    minimumRetweetsCount?: number;
    searchFromToday?: boolean;
    removePostsWithLinks?: boolean;
    removePostsWithMedia?: boolean;
  };
}

/**
 * Calculate engagement score for a tweet
 * Combines likes, retweets, and replies with weights
 */
function calculateEngagementScore(tweet: Tweet): number {
  const likes = tweet.likes || 0;
  const retweets = tweet.retweets || 0;
  const replies = tweet.replies || 0;
  const views = tweet.views || 0;

  // Weight: likes (1x), retweets (2x), replies (1.5x), views (0.001x)
  return likes + (retweets * 2) + (replies * 1.5) + (views * 0.001);
}

/**
 * Select the best tweet to reply to:
 * - Highest engagement score
 * - Among tweets with similar scores, pick the newest
 */
function selectBestTweet(tweets: Tweet[]): Tweet | null {
  if (!tweets || tweets.length === 0) return null;

  // Calculate engagement scores and sort
  const tweetsWithScores = tweets.map(tweet => ({
    tweet,
    score: calculateEngagementScore(tweet),
    timestamp: new Date(tweet.created_at).getTime(),
  }));

  // Sort by engagement score (descending), then by timestamp (descending)
  tweetsWithScores.sort((a, b) => {
    // If scores are within 10% of each other, prioritize newer tweets
    const scoreDiff = Math.abs(a.score - b.score);
    const avgScore = (a.score + b.score) / 2;
    const isScoreSimilar = avgScore > 0 && (scoreDiff / avgScore) < 0.1;

    if (isScoreSimilar) {
      return b.timestamp - a.timestamp; // Newer first
    }
    return b.score - a.score; // Higher score first
  });

  return tweetsWithScores[0].tweet;
}

export async function replyToTweetsWorkflow(config: WorkflowConfig) {
  const initialContext: WorkflowContext = {
    searchQuery: config.searchQuery,
    systemPrompt: config.systemPrompt,
    tweets: [],
    generatedReply: '',
  };

  const isDryRun = config.dryRun || false;

  const pipeline = createPipeline<WorkflowContext>();

  // Prepare search parameters with defaults
  const searchParams = config.searchParams || {};
  const today = new Date().toISOString().split('T')[0];

  const result = await pipeline
    .step('search-tweets', async (ctx) => {
      logger.info({ query: ctx.searchQuery, searchParams }, '🔍 Searching for tweets');

      const results = await searchTwitter({
        query: ctx.searchQuery,
        category: 'Latest',
        count: 20,
        since: searchParams.searchFromToday ? today : undefined,
        minimumLikesCount: searchParams.minimumLikesCount,
        minimumRetweetsCount: searchParams.minimumRetweetsCount,
        removePostsWithLinks: searchParams.removePostsWithLinks ?? true,
        removePostsWithMedia: searchParams.removePostsWithMedia ?? true,
      });

      logger.info({ count: results.results.length }, '✅ Found tweets');
      return { ...ctx, tweets: results.results };
    })
    .step('select-hottest', async (ctx) => {
      logger.info('🎯 Selecting best tweet to reply to');

      const selected = selectBestTweet(ctx.tweets || []);

      if (!selected) {
        logger.warn({ availableTweets: ctx.tweets?.length || 0 }, 'No suitable tweet found');
        throw new Error('No suitable tweet found to reply to');
      }

      logger.info(
        {
          username: selected.user_screen_name,
          tweetId: selected.tweet_id,
          likes: selected.likes || 0,
          retweets: selected.retweets || 0,
          text: selected.text.substring(0, 100),
        },
        `✅ Selected tweet from @${selected.user_screen_name}`
      );

      return { ...ctx, selectedTweet: selected };
    })
    .step('generate-reply', async (ctx) => {
      if (!ctx.selectedTweet) {
        throw new Error('No tweet selected');
      }

      logger.info(
        { tweetId: ctx.selectedTweet.tweet_id, hasSystemPrompt: !!ctx.systemPrompt },
        '🤖 Generating AI reply'
      );

      const reply = await generateTweetReply(
        ctx.selectedTweet.text,
        ctx.systemPrompt,
        !isDryRun // In dry-run mode, don't use default prompt
      );

      logger.info({ replyLength: reply.length, reply: reply.substring(0, 100) }, '✅ Generated reply');

      return { ...ctx, generatedReply: reply };
    })
    .step('post-reply', async (ctx): Promise<WorkflowContext> => {
      if (!ctx.selectedTweet || !ctx.generatedReply) {
        throw new Error('Missing tweet or reply');
      }

      if (isDryRun) {
        logger.info(
          {
            tweetId: ctx.selectedTweet.tweet_id,
            reply: ctx.generatedReply,
          },
          '🧪 DRY RUN MODE - Skipping actual post to Twitter'
        );
        return { ...ctx, replyResult: { dryRun: true, skipped: true } };
      }

      logger.info({ tweetId: ctx.selectedTweet.tweet_id }, '📤 Posting reply to Twitter');

      const result = await replyToTweet(
        ctx.selectedTweet.tweet_id,
        ctx.generatedReply
      );

      logger.info(
        { tweetId: ctx.selectedTweet.tweet_id, replyId: result.id },
        '✅ Reply posted successfully'
      );

      return { ...ctx, replyResult: result };
    })
    .execute(initialContext);

  return result.finalData as WorkflowContext;
}
