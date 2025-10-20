import { NextRequest, NextResponse } from 'next/server';
import { replyToTweetsWorkflow } from '@/lib/workflows/twitter/reply-to-tweets';
import { checkStrictRateLimit } from '@/lib/ratelimit';
import { logger, logApiRequest, logApiError } from '@/lib/logger';

/**
 * Test Reply Workflow API
 *
 * Runs the reply workflow in dry-run mode (doesn't actually post to Twitter)
 * Used for testing and refining system prompts
 *
 * POST /api/workflows/test-reply
 * Body: {
 *   searchQuery: string,
 *   systemPrompt?: string,
 *   minimumLikesCount?: number,
 *   minimumRetweetsCount?: number,
 *   searchFromToday?: boolean,
 *   removePostsWithLinks?: boolean,
 *   removePostsWithMedia?: boolean
 * }
 */

export async function POST(request: NextRequest) {
  // Apply strict rate limiting (3 requests per minute)
  const rateLimitResult = await checkStrictRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const {
      searchQuery,
      systemPrompt,
      minimumLikesCount,
      minimumRetweetsCount,
      searchFromToday,
      removePostsWithLinks,
      removePostsWithMedia
    } = body;

    if (!searchQuery || typeof searchQuery !== 'string') {
      logApiRequest('POST', '/api/workflows/test-reply', 400);
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: 'searchQuery is required and must be a string',
        },
        { status: 400 }
      );
    }

    logger.info({
      searchQuery,
      hasCustomPrompt: !!systemPrompt,
      minimumLikesCount,
      minimumRetweetsCount,
      searchFromToday
    }, 'Running test reply workflow');

    // Run workflow in dry-run mode
    const result = await replyToTweetsWorkflow({
      searchQuery,
      systemPrompt,
      dryRun: true,
      searchParams: {
        minimumLikesCount,
        minimumRetweetsCount,
        searchFromToday,
        removePostsWithLinks,
        removePostsWithMedia,
      },
    });

    // Check if workflow returned a valid result
    if (!result || !result.selectedTweet) {
      logApiRequest('POST', '/api/workflows/test-reply', 404);
      return NextResponse.json(
        {
          error: 'No tweets found',
          details: 'No suitable tweets were found matching your search criteria. Try a different search query or try again later.',
        },
        { status: 404 }
      );
    }

    logApiRequest('POST', '/api/workflows/test-reply', 200);

    return NextResponse.json({
      success: true,
      dryRun: true,
      selectedTweet: {
        id: result.selectedTweet.tweet_id,
        text: result.selectedTweet.text,
        author: result.selectedTweet.user_screen_name,
        authorName: result.selectedTweet.user_name,
        likes: result.selectedTweet.likes || 0,
        retweets: result.selectedTweet.retweets || 0,
        replies: result.selectedTweet.replies || 0,
        views: result.selectedTweet.views || 0,
        createdAt: result.selectedTweet.created_at,
      },
      generatedReply: result.generatedReply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logApiError('POST', '/api/workflows/test-reply', error);

    return NextResponse.json(
      {
        error: 'Failed to execute test workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to test reply workflow',
    usage: 'POST /api/workflows/test-reply',
    body: {
      searchQuery: 'string (required)',
      systemPrompt: 'string (optional)',
      minimumLikesCount: 'number (optional)',
      minimumRetweetsCount: 'number (optional)',
      searchFromToday: 'boolean (optional)',
      removePostsWithLinks: 'boolean (optional)',
      removePostsWithMedia: 'boolean (optional)',
    },
  });
}
