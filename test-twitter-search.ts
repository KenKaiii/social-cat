/**
 * Test script for Twitter search with enhanced parameters
 *
 * Goal: Get best performing tweets + newest from today + specific niche
 * + remove posts with links/images
 *
 * Run with: npx tsx test-twitter-search.ts
 */

import 'dotenv/config';
import { searchTwitter } from './src/lib/rapidapi/twitter/search';
import { logger } from './src/lib/logger';

async function testTwitterSearch() {
  try {
    logger.info('🧪 Testing Twitter Search with enhanced parameters...');

    // Today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    console.log(`\n📅 Searching for tweets from: ${today}`);
    console.log(`🔍 Query: AI automation`);
    console.log(`📊 Filters: Latest, min 5 likes, min 2 retweets, no links, no media\n`);

    const result = await searchTwitter({
      query: 'AI automation',
      category: 'Latest',
      count: 20,
      since: today,  // Only tweets from today
      minimumLikesCount: 5,  // At least 5 likes (best performing)
      minimumRetweetsCount: 2,  // At least 2 retweets
      removePostsWithLinks: true,
      removePostsWithMedia: true,
    });

    console.log(`\n✅ Search completed!`);
    console.log(`📝 Results: ${result.results.length} tweets\n`);

    if (result.results.length > 0) {
      console.log('─'.repeat(80));
      console.log('TOP 5 RESULTS:');
      console.log('─'.repeat(80));

      result.results.slice(0, 5).forEach((tweet, i) => {
        console.log(`\n[${i + 1}] @${tweet.user_screen_name}`);
        console.log(`    📅 ${tweet.created_at}`);
        console.log(`    💬 ${tweet.text.substring(0, 150)}${tweet.text.length > 150 ? '...' : ''}`);
        console.log(`    📊 Likes: ${tweet.likes} | RTs: ${tweet.retweets} | Replies: ${tweet.replies} | Views: ${tweet.views}`);
      });

      console.log('\n' + '─'.repeat(80));
    } else {
      console.log('⚠️ No tweets found matching criteria');
    }

    // Test with cursor for pagination
    if (result.next_cursor) {
      console.log(`\n📄 Next cursor available: ${result.next_cursor.substring(0, 50)}...`);
    }

  } catch (error: unknown) {
    console.error('\n❌ Error testing Twitter search:');
    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
    console.error(err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

// Run the test
testTwitterSearch();
