import Snoowrap from 'snoowrap';
import { createCircuitBreaker } from '@/lib/resilience';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';

/**
 * Reddit Module
 *
 * Post, comment, and interact with Reddit
 * - Submit posts to subreddits
 * - Comment on posts
 * - Search and fetch posts
 * - Vote and reply
 * - Built-in resilience
 *
 * Perfect for:
 * - Community engagement
 * - Content distribution
 * - Social listening
 * - Marketing automation
 */

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'b0t:v1.0.0 (by /u/bot)';

if (
  !REDDIT_CLIENT_ID ||
  !REDDIT_CLIENT_SECRET ||
  !REDDIT_USERNAME ||
  !REDDIT_PASSWORD
) {
  logger.warn('⚠️  Reddit credentials not set. Reddit features will not work.');
}

const redditClient =
  REDDIT_CLIENT_ID &&
  REDDIT_CLIENT_SECRET &&
  REDDIT_USERNAME &&
  REDDIT_PASSWORD
    ? new Snoowrap({
        clientId: REDDIT_CLIENT_ID,
        clientSecret: REDDIT_CLIENT_SECRET,
        username: REDDIT_USERNAME,
        password: REDDIT_PASSWORD,
        userAgent: REDDIT_USER_AGENT,
      })
    : null;

// Rate limiter: Reddit allows ~60 req/min for authenticated users
const redditRateLimiter = createRateLimiter({
  maxConcurrent: 1,
  minTime: 1000, // 1 second between requests
  reservoir: 60,
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60 * 1000,
  id: 'reddit',
});

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  permalink: string;
}

export interface RedditSubmitOptions {
  subreddit: string;
  title: string;
  text?: string;
  url?: string;
  flairId?: string;
  sendReplies?: boolean;
}

/**
 * Internal submit post function (unprotected)
 */
async function submitPostInternal(
  options: RedditSubmitOptions
): Promise<RedditPost> {
  if (!redditClient) {
    throw new Error('Reddit client not initialized. Set Reddit credentials.');
  }

  logger.info(
    {
      subreddit: options.subreddit,
      title: options.title.substring(0, 50),
      isLink: !!options.url,
    },
    'Submitting Reddit post'
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subreddit: any = await (redditClient.getSubreddit(options.subreddit) as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let submission: any;

  if (options.url) {
    const linkSubmission = await subreddit.submitLink({
      title: options.title,
      url: options.url,
      flairId: options.flairId,
      sendReplies: options.sendReplies,
    });
    submission = linkSubmission as never;
  } else {
    const selfSubmission = await subreddit.submitSelfpost({
      title: options.title,
      text: options.text || '',
      flairId: options.flairId,
      sendReplies: options.sendReplies,
    });
    submission = selfSubmission as never;
  }

  logger.info({ postId: submission.id }, 'Reddit post submitted');

  return {
    id: submission.id,
    title: submission.title,
    selftext: submission.selftext,
    url: submission.url,
    author: submission.author.name,
    subreddit: submission.subreddit.display_name,
    score: submission.score,
    numComments: submission.num_comments,
    permalink: `https://reddit.com${submission.permalink}`,
  };
}

/**
 * Submit post (protected)
 */
const submitPostWithBreaker = createCircuitBreaker(submitPostInternal, {
  timeout: 15000,
  name: 'reddit-submit-post',
});

const submitPostRateLimited = withRateLimit(
  async (options: RedditSubmitOptions) => submitPostWithBreaker.fire(options),
  redditRateLimiter
);

export async function submitPost(
  options: RedditSubmitOptions
): Promise<RedditPost> {
  return (await submitPostRateLimited(options)) as unknown as RedditPost;
}

/**
 * Comment on post
 */
export async function commentOnPost(
  postId: string,
  text: string
): Promise<{ id: string; permalink: string }> {
  if (!redditClient) {
    throw new Error('Reddit client not initialized. Set Reddit credentials.');
  }

  logger.info({ postId, textLength: text.length }, 'Commenting on Reddit post');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submission: any = await (redditClient.getSubmission(postId) as any);
  const comment = (await submission.reply(text)) as unknown as { id: string; permalink: string };

  logger.info({ commentId: comment.id }, 'Reddit comment posted');

  return {
    id: comment.id,
    permalink: `https://reddit.com${comment.permalink}`,
  };
}

/**
 * Reply to comment
 */
export async function replyToComment(
  commentId: string,
  text: string
): Promise<{ id: string; permalink: string }> {
  if (!redditClient) {
    throw new Error('Reddit client not initialized. Set Reddit credentials.');
  }

  logger.info({ commentId, textLength: text.length }, 'Replying to Reddit comment');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comment: any = await (redditClient.getComment(commentId) as any);
  const reply = (await comment.reply(text)) as unknown as { id: string; permalink: string };

  logger.info({ replyId: reply.id }, 'Reddit reply posted');

  return {
    id: reply.id,
    permalink: `https://reddit.com${reply.permalink}`,
  };
}

/**
 * Get posts from subreddit
 */
export async function getSubredditPosts(
  subreddit: string,
  sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
  limit: number = 25
): Promise<RedditPost[]> {
  if (!redditClient) {
    throw new Error('Reddit client not initialized. Set Reddit credentials.');
  }

  logger.info({ subreddit, sort, limit }, 'Fetching Reddit posts');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = await (redditClient.getSubreddit(subreddit) as any);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listing: any;
  switch (sort) {
    case 'hot':
      listing = await sub.getHot({ limit });
      break;
    case 'new':
      listing = await sub.getNew({ limit });
      break;
    case 'top':
      listing = await sub.getTop({ limit });
      break;
    case 'rising':
      listing = await sub.getRising({ limit });
      break;
  }

  logger.info({ postCount: listing.length }, 'Reddit posts fetched');

  return listing.map((post: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: { name: string };
    subreddit: { display_name: string };
    score: number;
    num_comments: number;
    permalink: string;
  }) => ({
    id: post.id,
    title: post.title,
    selftext: post.selftext,
    url: post.url,
    author: post.author.name,
    subreddit: post.subreddit.display_name,
    score: post.score,
    numComments: post.num_comments,
    permalink: `https://reddit.com${post.permalink}`,
  }));
}

/**
 * Search posts
 */
export async function searchPosts(
  query: string,
  subreddit?: string,
  limit: number = 25
): Promise<RedditPost[]> {
  if (!redditClient) {
    throw new Error('Reddit client not initialized. Set Reddit credentials.');
  }

  logger.info({ query, subreddit, limit }, 'Searching Reddit posts');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: any;
  if (subreddit) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = await (redditClient.getSubreddit(subreddit) as any);
    results = await sub.search({ query, limit });
  } else {
    results = await redditClient.search({ query, limit });
  }

  logger.info({ resultCount: results.length }, 'Reddit search completed');

  return results.map((post: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: { name: string };
    subreddit: { display_name: string };
    score: number;
    num_comments: number;
    permalink: string;
  }) => ({
    id: post.id,
    title: post.title,
    selftext: post.selftext,
    url: post.url,
    author: post.author.name,
    subreddit: post.subreddit.display_name,
    score: post.score,
    numComments: post.num_comments,
    permalink: `https://reddit.com${post.permalink}`,
  }));
}

/**
 * Upvote post
 */
export async function upvotePost(postId: string): Promise<void> {
  if (!redditClient) {
    throw new Error('Reddit client not initialized. Set Reddit credentials.');
  }

  logger.info({ postId }, 'Upvoting Reddit post');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submission = await (redditClient.getSubmission(postId) as any);
  await (submission as unknown as { upvote: () => Promise<void> }).upvote();

  logger.info('Reddit post upvoted');
}

/**
 * Downvote post
 */
export async function downvotePost(postId: string): Promise<void> {
  if (!redditClient) {
    throw new Error('Reddit client not initialized. Set Reddit credentials.');
  }

  logger.info({ postId }, 'Downvoting Reddit post');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submission = await (redditClient.getSubmission(postId) as any);
  await (submission as unknown as { downvote: () => Promise<void> }).downvote();

  logger.info('Reddit post downvoted');
}
