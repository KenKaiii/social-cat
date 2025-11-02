import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index as sqliteIndex, uniqueIndex as sqliteUniqueIndex } from 'drizzle-orm/sqlite-core';
import { pgTable, serial, text as pgText, timestamp, varchar, integer as pgInteger, index as pgIndex, uniqueIndex as pgUniqueIndex } from 'drizzle-orm/pg-core';

// For SQLite (development)
export const tweetsTableSQLite = sqliteTable('tweets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  tweetId: text('tweet_id'),
  status: text('status').notNull().default('draft'), // draft, posted, failed
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  postedAt: integer('posted_at', { mode: 'timestamp' }),
}, (table) => ({
  statusIdx: sqliteIndex('tweets_status_idx').on(table.status),
  createdAtIdx: sqliteIndex('tweets_created_at_idx').on(table.createdAt),
  statusCreatedAtIdx: sqliteIndex('tweets_status_created_at_idx').on(table.status, table.createdAt),
}));

// User authentication tables for SQLite
export const accountsTableSQLite = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  account_name: text('account_name'), // Display name (e.g., Twitter username, YouTube channel name)
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  userIdIdx: sqliteIndex('accounts_user_id_idx').on(table.userId),
  providerIdx: sqliteIndex('accounts_provider_idx').on(table.provider),
  userProviderIdx: sqliteIndex('accounts_user_provider_idx').on(table.userId, table.provider),
  providerAccountIdx: sqliteUniqueIndex('accounts_provider_account_idx').on(table.provider, table.providerAccountId),
}));

// YouTube tables for SQLite
export const youtubeVideosTableSQLite = sqliteTable('youtube_videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  videoId: text('video_id').notNull().unique(),
  title: text('title'),
  channelId: text('channel_id'),
  channelTitle: text('channel_title'),
  description: text('description'),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  lastChecked: integer('last_checked', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  channelIdIdx: sqliteIndex('youtube_videos_channel_id_idx').on(table.channelId),
  lastCheckedIdx: sqliteIndex('youtube_videos_last_checked_idx').on(table.lastChecked),
}));

export const youtubeCommentsTableSQLite = sqliteTable('youtube_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commentId: text('comment_id').notNull().unique(),
  videoId: text('video_id').notNull(),
  parentId: text('parent_id'), // For replies
  text: text('text').notNull(),
  authorDisplayName: text('author_display_name'),
  authorChannelId: text('author_channel_id'),
  replyText: text('reply_text'), // Our reply to this comment
  repliedAt: integer('replied_at', { mode: 'timestamp' }),
  status: text('status').notNull().default('pending'), // pending, replied, ignored
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  videoIdIdx: sqliteIndex('youtube_comments_video_id_idx').on(table.videoId),
  statusIdx: sqliteIndex('youtube_comments_status_idx').on(table.status),
  videoStatusIdx: sqliteIndex('youtube_comments_video_status_idx').on(table.videoId, table.status),
  statusCreatedIdx: sqliteIndex('youtube_comments_status_created_idx').on(table.status, table.createdAt),
}));

// OAuth state table for SQLite (temporary storage during OAuth flow)
export const oauthStateTableSQLite = sqliteTable('oauth_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  state: text('state').notNull().unique(),
  codeVerifier: text('code_verifier').notNull(),
  userId: text('user_id').notNull(),
  provider: text('provider').notNull(), // twitter, youtube, instagram
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: sqliteIndex('oauth_state_user_id_idx').on(table.userId),
  createdAtIdx: sqliteIndex('oauth_state_created_at_idx').on(table.createdAt),
}));

// Tweet replies table for SQLite (tracks our replies to tweets)
export const tweetRepliesTableSQLite = sqliteTable('tweet_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  originalTweetId: text('original_tweet_id').notNull(),
  originalTweetText: text('original_tweet_text').notNull(),
  originalTweetAuthor: text('original_tweet_author').notNull(), // username
  originalTweetAuthorName: text('original_tweet_author_name'), // display name
  originalTweetLikes: integer('original_tweet_likes').default(0),
  originalTweetRetweets: integer('original_tweet_retweets').default(0),
  originalTweetReplies: integer('original_tweet_replies').default(0),
  originalTweetViews: integer('original_tweet_views').default(0),
  ourReplyText: text('our_reply_text').notNull(),
  ourReplyTweetId: text('our_reply_tweet_id'), // null if dry-run or failed
  status: text('status').notNull().default('pending'), // pending, posted, failed
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  repliedAt: integer('replied_at', { mode: 'timestamp' }),
}, (table) => ({
  originalTweetIdIdx: sqliteIndex('tweet_replies_original_tweet_id_idx').on(table.originalTweetId),
  statusIdx: sqliteIndex('tweet_replies_status_idx').on(table.status),
  createdAtIdx: sqliteIndex('tweet_replies_created_at_idx').on(table.createdAt),
  repliedAtIdx: sqliteIndex('tweet_replies_replied_at_idx').on(table.repliedAt),
  originalTweetStatusIdx: sqliteIndex('tweet_replies_original_tweet_status_idx').on(table.originalTweetId, table.status),
}));

// App settings table for SQLite (stores user preferences and configurations)
export const appSettingsTableSQLite = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  keyIdx: sqliteIndex('app_settings_key_idx').on(table.key),
}));

// Posted news articles table for SQLite (tracks articles we've posted threads about)
export const postedNewsArticlesTableSQLite = sqliteTable('posted_news_articles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  articleUrl: text('article_url').notNull().unique(),
  articleTitle: text('article_title').notNull(),
  articleSource: text('article_source'),
  articleDate: text('article_date'),
  newsTopic: text('news_topic'),
  threadTweetIds: text('thread_tweet_ids'), // JSON array of tweet IDs
  postedAt: integer('posted_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  urlIdx: sqliteUniqueIndex('posted_news_articles_url_idx').on(table.articleUrl),
  topicIdx: sqliteIndex('posted_news_articles_topic_idx').on(table.newsTopic),
  postedAtIdx: sqliteIndex('posted_news_articles_posted_at_idx').on(table.postedAt),
}));

// For PostgreSQL (production)
export const tweetsTablePostgres = pgTable('tweets', {
  id: serial('id').primaryKey(),
  content: pgText('content').notNull(),
  tweetId: varchar('tweet_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  postedAt: timestamp('posted_at'),
}, (table) => ({
  statusIdx: pgIndex('tweets_status_idx').on(table.status),
  createdAtIdx: pgIndex('tweets_created_at_idx').on(table.createdAt),
  statusCreatedAtIdx: pgIndex('tweets_status_created_at_idx').on(table.status, table.createdAt),
}));

// User authentication tables for PostgreSQL
export const accountsTablePostgres = pgTable('accounts', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  account_name: varchar('account_name', { length: 255 }), // Display name (e.g., Twitter username, YouTube channel name)
  refresh_token: pgText('refresh_token'),
  access_token: pgText('access_token'),
  expires_at: pgInteger('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: pgText('scope'),
  id_token: pgText('id_token'),
  session_state: pgText('session_state'),
}, (table) => ({
  userIdIdx: pgIndex('accounts_user_id_idx').on(table.userId),
  providerIdx: pgIndex('accounts_provider_idx').on(table.provider),
  userProviderIdx: pgIndex('accounts_user_provider_idx').on(table.userId, table.provider),
  providerAccountIdx: pgUniqueIndex('accounts_provider_account_idx').on(table.provider, table.providerAccountId),
}));

// YouTube tables for PostgreSQL
export const youtubeVideosTablePostgres = pgTable('youtube_videos', {
  id: serial('id').primaryKey(),
  videoId: varchar('video_id', { length: 255 }).notNull().unique(),
  title: pgText('title'),
  channelId: varchar('channel_id', { length: 255 }),
  channelTitle: varchar('channel_title', { length: 255 }),
  description: pgText('description'),
  publishedAt: timestamp('published_at'),
  lastChecked: timestamp('last_checked').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  channelIdIdx: pgIndex('youtube_videos_channel_id_idx').on(table.channelId),
  lastCheckedIdx: pgIndex('youtube_videos_last_checked_idx').on(table.lastChecked),
}));

export const youtubeCommentsTablePostgres = pgTable('youtube_comments', {
  id: serial('id').primaryKey(),
  commentId: varchar('comment_id', { length: 255 }).notNull().unique(),
  videoId: varchar('video_id', { length: 255 }).notNull(),
  parentId: varchar('parent_id', { length: 255 }),
  text: pgText('text').notNull(),
  authorDisplayName: varchar('author_display_name', { length: 255 }),
  authorChannelId: varchar('author_channel_id', { length: 255 }),
  replyText: pgText('reply_text'),
  repliedAt: timestamp('replied_at'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  videoIdIdx: pgIndex('youtube_comments_video_id_idx').on(table.videoId),
  statusIdx: pgIndex('youtube_comments_status_idx').on(table.status),
  videoStatusIdx: pgIndex('youtube_comments_video_status_idx').on(table.videoId, table.status),
  statusCreatedIdx: pgIndex('youtube_comments_status_created_idx').on(table.status, table.createdAt),
}));

// OAuth state table for PostgreSQL (temporary storage during OAuth flow)
export const oauthStateTablePostgres = pgTable('oauth_state', {
  id: serial('id').primaryKey(),
  state: varchar('state', { length: 255 }).notNull().unique(),
  codeVerifier: pgText('code_verifier').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: pgIndex('oauth_state_user_id_idx').on(table.userId),
  createdAtIdx: pgIndex('oauth_state_created_at_idx').on(table.createdAt),
}));

// Tweet replies table for PostgreSQL (tracks our replies to tweets)
export const tweetRepliesTablePostgres = pgTable('tweet_replies', {
  id: serial('id').primaryKey(),
  originalTweetId: varchar('original_tweet_id', { length: 255 }).notNull(),
  originalTweetText: pgText('original_tweet_text').notNull(),
  originalTweetAuthor: varchar('original_tweet_author', { length: 255 }).notNull(), // username
  originalTweetAuthorName: varchar('original_tweet_author_name', { length: 255 }), // display name
  originalTweetLikes: pgInteger('original_tweet_likes').default(0),
  originalTweetRetweets: pgInteger('original_tweet_retweets').default(0),
  originalTweetReplies: pgInteger('original_tweet_replies').default(0),
  originalTweetViews: pgInteger('original_tweet_views').default(0),
  ourReplyText: pgText('our_reply_text').notNull(),
  ourReplyTweetId: varchar('our_reply_tweet_id', { length: 255 }), // null if dry-run or failed
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, posted, failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  repliedAt: timestamp('replied_at'),
}, (table) => ({
  originalTweetIdIdx: pgIndex('tweet_replies_original_tweet_id_idx').on(table.originalTweetId),
  statusIdx: pgIndex('tweet_replies_status_idx').on(table.status),
  createdAtIdx: pgIndex('tweet_replies_created_at_idx').on(table.createdAt),
  repliedAtIdx: pgIndex('tweet_replies_replied_at_idx').on(table.repliedAt),
  originalTweetStatusIdx: pgIndex('tweet_replies_original_tweet_status_idx').on(table.originalTweetId, table.status),
}));

// App settings table for PostgreSQL (stores user preferences and configurations)
export const appSettingsTablePostgres = pgTable('app_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: pgText('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  keyIdx: pgIndex('app_settings_key_idx').on(table.key),
}));

// Posted news articles table for PostgreSQL (tracks articles we've posted threads about)
export const postedNewsArticlesTablePostgres = pgTable('posted_news_articles', {
  id: serial('id').primaryKey(),
  articleUrl: varchar('article_url', { length: 1024 }).notNull().unique(),
  articleTitle: pgText('article_title').notNull(),
  articleSource: varchar('article_source', { length: 255 }),
  articleDate: varchar('article_date', { length: 100 }),
  newsTopic: varchar('news_topic', { length: 100 }),
  threadTweetIds: pgText('thread_tweet_ids'), // JSON array of tweet IDs
  postedAt: timestamp('posted_at').notNull().defaultNow(),
}, (table) => ({
  urlIdx: pgUniqueIndex('posted_news_articles_url_idx').on(table.articleUrl),
  topicIdx: pgIndex('posted_news_articles_topic_idx').on(table.newsTopic),
  postedAtIdx: pgIndex('posted_news_articles_posted_at_idx').on(table.postedAt),
}));

// Job logs table for SQLite (tracks job execution history)
export const jobLogsTableSQLite = sqliteTable('job_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobName: text('job_name').notNull(), // e.g., 'reply-to-tweets'
  status: text('status').notNull(), // success, error, warning
  message: text('message').notNull(), // Main log message
  details: text('details'), // JSON string with additional data
  duration: integer('duration'), // Execution time in milliseconds
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  jobNameIdx: sqliteIndex('job_logs_job_name_idx').on(table.jobName),
  statusIdx: sqliteIndex('job_logs_status_idx').on(table.status),
  createdAtIdx: sqliteIndex('job_logs_created_at_idx').on(table.createdAt),
}));

// Job logs table for PostgreSQL
export const jobLogsTablePostgres = pgTable('job_logs', {
  id: serial('id').primaryKey(),
  jobName: varchar('job_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(), // success, error, warning
  message: pgText('message').notNull(),
  details: pgText('details'), // JSON string with additional data
  duration: pgInteger('duration'), // Execution time in milliseconds
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  jobNameIdx: pgIndex('job_logs_job_name_idx').on(table.jobName),
  statusIdx: pgIndex('job_logs_status_idx').on(table.status),
  createdAtIdx: pgIndex('job_logs_created_at_idx').on(table.createdAt),
}));

// Determine which database to use based on environment
const useSQLite = !process.env.DATABASE_URL;

// Twitter usage tracking table for SQLite (atomic operations for rate limiting)
export const twitterUsageTableSQLite = sqliteTable('twitter_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  windowType: text('window_type').notNull().unique(), // '15min', '1hour', '24hour', 'daily', 'monthly'
  postsCount: integer('posts_count').notNull().default(0),
  readsCount: integer('reads_count').notNull().default(0),
  windowStart: integer('window_start', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  windowTypeIdx: sqliteIndex('twitter_usage_window_type_idx').on(table.windowType),
  windowStartIdx: sqliteIndex('twitter_usage_window_start_idx').on(table.windowStart),
}));

// Twitter usage tracking table for PostgreSQL
export const twitterUsageTablePostgres = pgTable('twitter_usage', {
  id: serial('id').primaryKey(),
  windowType: varchar('window_type', { length: 50 }).notNull().unique(),
  postsCount: pgInteger('posts_count').notNull().default(0),
  readsCount: pgInteger('reads_count').notNull().default(0),
  windowStart: timestamp('window_start').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  windowTypeIdx: pgIndex('twitter_usage_window_type_idx').on(table.windowType),
  windowStartIdx: pgIndex('twitter_usage_window_start_idx').on(table.windowStart),
}));

// YouTube comment replies table for SQLite (tracks our replies to YouTube comments)
export const youtubeCommentRepliesTableSQLite = sqliteTable('youtube_comment_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  originalCommentId: text('original_comment_id').notNull().unique(), // Prevents duplicate replies
  originalCommentText: text('original_comment_text').notNull(),
  originalCommentAuthor: text('original_comment_author').notNull(), // Display name
  originalCommentLikes: integer('original_comment_likes').default(0),
  videoId: text('video_id').notNull(),
  videoTitle: text('video_title'),
  ourReplyText: text('our_reply_text').notNull(),
  ourReplyCommentId: text('our_reply_comment_id'), // null if dry-run or failed
  status: text('status').notNull().default('pending'), // pending, posted, failed
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  repliedAt: integer('replied_at', { mode: 'timestamp' }),
}, (table) => ({
  originalCommentIdIdx: sqliteUniqueIndex('youtube_comment_replies_original_comment_id_idx').on(table.originalCommentId),
  statusIdx: sqliteIndex('youtube_comment_replies_status_idx').on(table.status),
  createdAtIdx: sqliteIndex('youtube_comment_replies_created_at_idx').on(table.createdAt),
  videoIdIdx: sqliteIndex('youtube_comment_replies_video_id_idx').on(table.videoId),
  videoStatusIdx: sqliteIndex('youtube_comment_replies_video_status_idx').on(table.videoId, table.status),
}));

// YouTube usage tracking table for SQLite (atomic operations for rate limiting)
export const youtubeUsageTableSQLite = sqliteTable('youtube_usage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  windowType: text('window_type').notNull().unique(), // '15min', '1hour', '24hour', 'daily', 'monthly'
  commentsCount: integer('comments_count').notNull().default(0),
  videosCount: integer('videos_count').notNull().default(0),
  quotaUnits: integer('quota_units').notNull().default(0), // YouTube API quota units
  windowStart: integer('window_start', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  windowTypeIdx: sqliteIndex('youtube_usage_window_type_idx').on(table.windowType),
  windowStartIdx: sqliteIndex('youtube_usage_window_start_idx').on(table.windowStart),
}));


// YouTube comment replies table for PostgreSQL (tracks our replies to YouTube comments)
export const youtubeCommentRepliesTablePostgres = pgTable('youtube_comment_replies', {
  id: serial('id').primaryKey(),
  originalCommentId: varchar('original_comment_id', { length: 255 }).notNull().unique(), // Prevents duplicate replies
  originalCommentText: pgText('original_comment_text').notNull(),
  originalCommentAuthor: varchar('original_comment_author', { length: 255 }).notNull(), // Display name
  originalCommentLikes: pgInteger('original_comment_likes').default(0),
  videoId: varchar('video_id', { length: 255 }).notNull(),
  videoTitle: pgText('video_title'),
  ourReplyText: pgText('our_reply_text').notNull(),
  ourReplyCommentId: varchar('our_reply_comment_id', { length: 255 }), // null if dry-run or failed
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, posted, failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  repliedAt: timestamp('replied_at'),
}, (table) => ({
  originalCommentIdIdx: pgUniqueIndex('youtube_comment_replies_original_comment_id_idx').on(table.originalCommentId),
  statusIdx: pgIndex('youtube_comment_replies_status_idx').on(table.status),
  createdAtIdx: pgIndex('youtube_comment_replies_created_at_idx').on(table.createdAt),
  videoIdIdx: pgIndex('youtube_comment_replies_video_id_idx').on(table.videoId),
  videoStatusIdx: pgIndex('youtube_comment_replies_video_status_idx').on(table.videoId, table.status),
}));

// YouTube usage tracking table for PostgreSQL (atomic operations for rate limiting)
export const youtubeUsageTablePostgres = pgTable('youtube_usage', {
  id: serial('id').primaryKey(),
  windowType: varchar('window_type', { length: 50 }).notNull().unique(), // '15min', '1hour', '24hour', 'daily', 'monthly'
  commentsCount: pgInteger('comments_count').notNull().default(0),
  videosCount: pgInteger('videos_count').notNull().default(0),
  quotaUnits: pgInteger('quota_units').notNull().default(0), // YouTube API quota units
  windowStart: timestamp('window_start').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  windowTypeIdx: pgIndex('youtube_usage_window_type_idx').on(table.windowType),
  windowStartIdx: pgIndex('youtube_usage_window_start_idx').on(table.windowStart),
}));

// WordPress posts table for SQLite (tracks our WordPress blog posts)
export const wordpressPostsTableSQLite = sqliteTable('wordpress_posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  postId: text('post_id').notNull(), // WordPress post ID
  title: text('title').notNull(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  url: text('url'),
  status: text('status').notNull().default('draft'), // draft, publish, scheduled, failed
  topic: text('topic'), // News topic or category
  featuredImage: text('featured_image'), // Image URL or media ID
  categories: text('categories'), // JSON array of category IDs
  tags: text('tags'), // JSON array of tag names
  postedAt: integer('posted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: sqliteIndex('wordpress_posts_user_id_idx').on(table.userId),
  statusIdx: sqliteIndex('wordpress_posts_status_idx').on(table.status),
  topicIdx: sqliteIndex('wordpress_posts_topic_idx').on(table.topic),
  postedAtIdx: sqliteIndex('wordpress_posts_posted_at_idx').on(table.postedAt),
  postIdIdx: sqliteIndex('wordpress_posts_post_id_idx').on(table.postId),
}));

// WordPress posts table for PostgreSQL
export const wordpressPostsTablePostgres = pgTable('wordpress_posts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  postId: varchar('post_id', { length: 255 }).notNull(), // WordPress post ID
  title: pgText('title').notNull(),
  content: pgText('content').notNull(),
  excerpt: pgText('excerpt'),
  url: varchar('url', { length: 1024 }),
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, publish, scheduled, failed
  topic: varchar('topic', { length: 255 }), // News topic or category
  featuredImage: varchar('featured_image', { length: 1024 }), // Image URL or media ID
  categories: pgText('categories'), // JSON array of category IDs
  tags: pgText('tags'), // JSON array of tag names
  postedAt: timestamp('posted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: pgIndex('wordpress_posts_user_id_idx').on(table.userId),
  statusIdx: pgIndex('wordpress_posts_status_idx').on(table.status),
  topicIdx: pgIndex('wordpress_posts_topic_idx').on(table.topic),
  postedAtIdx: pgIndex('wordpress_posts_posted_at_idx').on(table.postedAt),
  postIdIdx: pgIndex('wordpress_posts_post_id_idx').on(table.postId),
}));

// WordPress settings table for SQLite (stores WordPress configuration per user)
export const wordpressSettingsTableSQLite = sqliteTable('wordpress_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().unique(),
  siteUrl: text('site_url').notNull(),
  username: text('username').notNull(),
  applicationPassword: text('application_password').notNull(), // Encrypted
  defaultCategory: text('default_category'), // Default category ID
  defaultTags: text('default_tags'), // JSON array of default tag names
  enabledTopics: text('enabled_topics'), // JSON array: ['tech', 'business', 'ai']
  postFrequency: text('post_frequency'), // Cron expression
  autoPublish: integer('auto_publish').default(0), // 0 = draft, 1 = publish
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  userIdIdx: sqliteUniqueIndex('wordpress_settings_user_id_idx').on(table.userId),
}));

// WordPress settings table for PostgreSQL
export const wordpressSettingsTablePostgres = pgTable('wordpress_settings', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().unique(),
  siteUrl: varchar('site_url', { length: 1024 }).notNull(),
  username: varchar('username', { length: 255 }).notNull(),
  applicationPassword: pgText('application_password').notNull(), // Encrypted
  defaultCategory: varchar('default_category', { length: 255 }), // Default category ID
  defaultTags: pgText('default_tags'), // JSON array of default tag names
  enabledTopics: pgText('enabled_topics'), // JSON array: ['tech', 'business', 'ai']
  postFrequency: varchar('post_frequency', { length: 100 }), // Cron expression
  autoPublish: pgInteger('auto_publish').default(0), // 0 = draft, 1 = publish
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: pgUniqueIndex('wordpress_settings_user_id_idx').on(table.userId),
}));


// Export the appropriate tables based on environment
// This will be imported and used throughout the app
export const tweetsTable = useSQLite ? tweetsTableSQLite : tweetsTablePostgres;
export const accountsTable = useSQLite ? accountsTableSQLite : accountsTablePostgres;
export const youtubeVideosTable = useSQLite ? youtubeVideosTableSQLite : youtubeVideosTablePostgres;
export const youtubeCommentsTable = useSQLite ? youtubeCommentsTableSQLite : youtubeCommentsTablePostgres;
export const oauthStateTable = useSQLite ? oauthStateTableSQLite : oauthStateTablePostgres;
export const tweetRepliesTable = useSQLite ? tweetRepliesTableSQLite : tweetRepliesTablePostgres;
export const appSettingsTable = useSQLite ? appSettingsTableSQLite : appSettingsTablePostgres;
export const postedNewsArticlesTable = useSQLite ? postedNewsArticlesTableSQLite : postedNewsArticlesTablePostgres;
export const jobLogsTable = useSQLite ? jobLogsTableSQLite : jobLogsTablePostgres;
export const twitterUsageTable = useSQLite ? twitterUsageTableSQLite : twitterUsageTablePostgres;
export const youtubeCommentRepliesTable = useSQLite ? youtubeCommentRepliesTableSQLite : youtubeCommentRepliesTablePostgres;
export const youtubeUsageTable = useSQLite ? youtubeUsageTableSQLite : youtubeUsageTablePostgres;
export const wordpressPostsTable = useSQLite ? wordpressPostsTableSQLite : wordpressPostsTablePostgres;
export const wordpressSettingsTable = useSQLite ? wordpressSettingsTableSQLite : wordpressSettingsTablePostgres;

export type Tweet = typeof tweetsTableSQLite.$inferSelect;
export type NewTweet = typeof tweetsTableSQLite.$inferInsert;
export type Account = typeof accountsTableSQLite.$inferSelect;
export type NewAccount = typeof accountsTableSQLite.$inferInsert;
export type YouTubeVideo = typeof youtubeVideosTableSQLite.$inferSelect;
export type NewYouTubeVideo = typeof youtubeVideosTableSQLite.$inferInsert;
export type YouTubeComment = typeof youtubeCommentsTableSQLite.$inferSelect;
export type NewYouTubeComment = typeof youtubeCommentsTableSQLite.$inferInsert;
export type OAuthState = typeof oauthStateTableSQLite.$inferSelect;
export type NewOAuthState = typeof oauthStateTableSQLite.$inferInsert;
export type TweetReply = typeof tweetRepliesTableSQLite.$inferSelect;
export type NewTweetReply = typeof tweetRepliesTableSQLite.$inferInsert;
export type AppSetting = typeof appSettingsTableSQLite.$inferSelect;
export type NewAppSetting = typeof appSettingsTableSQLite.$inferInsert;
export type JobLog = typeof jobLogsTableSQLite.$inferSelect;
export type NewJobLog = typeof jobLogsTableSQLite.$inferInsert;
export type TwitterUsage = typeof twitterUsageTableSQLite.$inferSelect;
export type NewTwitterUsage = typeof twitterUsageTableSQLite.$inferInsert;
export type YouTubeCommentReply = typeof youtubeCommentRepliesTableSQLite.$inferSelect;
export type NewYouTubeCommentReply = typeof youtubeCommentRepliesTableSQLite.$inferInsert;
export type YouTubeUsage = typeof youtubeUsageTableSQLite.$inferSelect;
export type NewYouTubeUsage = typeof youtubeUsageTableSQLite.$inferInsert;
export type WordPressPost = typeof wordpressPostsTableSQLite.$inferSelect;
export type NewWordPressPost = typeof wordpressPostsTableSQLite.$inferInsert;
export type WordPressSettings = typeof wordpressSettingsTableSQLite.$inferSelect;
export type NewWordPressSettings = typeof wordpressSettingsTableSQLite.$inferInsert;

// LLM-generated workflows table for SQLite
export const workflowsTableSQLite = sqliteTable('workflows', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'), // Optional for now, will be required after migration
  name: text('name').notNull(),
  description: text('description'),

  // User's original prompt
  prompt: text('prompt').notNull(),

  // LLM-generated workflow configuration
  config: text('config', { mode: 'json' }).notNull().$type<{
    steps: Array<{
      id: string;
      module: string; // e.g., 'communication.email.sendEmail'
      inputs: Record<string, unknown>;
      outputAs?: string; // Variable name for next steps
    }>;
  }>(),

  // Trigger configuration
  trigger: text('trigger', { mode: 'json' }).notNull().$type<{
    type: 'cron' | 'manual' | 'webhook' | 'telegram' | 'discord' | 'chat';
    config: Record<string, unknown>;
  }>(),

  status: text('status').notNull().default('draft'), // draft | active | paused | error
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  lastRun: integer('last_run', { mode: 'timestamp' }),
  lastRunStatus: text('last_run_status'), // success | error
  lastRunError: text('last_run_error'),
  runCount: integer('run_count').notNull().default(0),
}, (table) => ({
  userIdIdx: sqliteIndex('workflows_user_id_idx').on(table.userId),
  organizationIdIdx: sqliteIndex('workflows_organization_id_idx').on(table.organizationId),
  statusIdx: sqliteIndex('workflows_status_idx').on(table.status),
  triggerTypeIdx: sqliteIndex('workflows_trigger_type_idx').on(sql`json_extract(${table.trigger}, '$.type')`),
}));

// Workflow run history table for SQLite
export const workflowRunsTableSQLite = sqliteTable('workflow_runs', {
  id: text('id').primaryKey(),
  workflowId: text('workflow_id').notNull(),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'), // Optional for now, will be required after migration

  status: text('status').notNull(), // running | success | error
  triggerType: text('trigger_type').notNull(), // cron | manual | webhook | etc
  triggerData: text('trigger_data', { mode: 'json' }),

  // Execution details
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  duration: integer('duration'), // milliseconds

  // Results
  output: text('output', { mode: 'json' }),
  error: text('error'),
  errorStep: text('error_step'),
}, (table) => ({
  workflowIdIdx: sqliteIndex('workflow_runs_workflow_id_idx').on(table.workflowId),
  userIdIdx: sqliteIndex('workflow_runs_user_id_idx').on(table.userId),
  organizationIdIdx: sqliteIndex('workflow_runs_organization_id_idx').on(table.organizationId),
  statusIdx: sqliteIndex('workflow_runs_status_idx').on(table.status),
  startedAtIdx: sqliteIndex('workflow_runs_started_at_idx').on(table.startedAt),
}));

// User credentials table for SQLite (encrypted API keys, tokens, secrets)
export const userCredentialsTableSQLite = sqliteTable('user_credentials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  organizationId: text('organization_id'), // Optional for now, will be required after migration
  platform: text('platform').notNull(), // openai, anthropic, stripe, custom
  name: text('name').notNull(), // User-friendly name (e.g., "My OpenAI Key", "Production Stripe")
  encryptedValue: text('encrypted_value').notNull(), // AES-256 encrypted credential
  type: text('type').notNull(), // api_key, token, secret, connection_string
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(), // Extra info (e.g., rate limits, environment)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastUsed: integer('last_used', { mode: 'timestamp' }),
}, (table) => ({
  userIdIdx: sqliteIndex('user_credentials_user_id_idx').on(table.userId),
  organizationIdIdx: sqliteIndex('user_credentials_organization_id_idx').on(table.organizationId),
  platformIdx: sqliteIndex('user_credentials_platform_idx').on(table.platform),
  userPlatformIdx: sqliteIndex('user_credentials_user_platform_idx').on(table.userId, table.platform),
}));

// Organizations table for SQLite (multi-tenancy support)
export const organizationsTableSQLite = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: text('owner_id').notNull(), // User who created/owns the organization
  plan: text('plan').notNull().default('free'), // free | pro | enterprise
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  ownerIdIdx: sqliteIndex('organizations_owner_id_idx').on(table.ownerId),
  slugIdx: sqliteIndex('organizations_slug_idx').on(table.slug),
}));

// Organization members table for SQLite (user-org relationship with roles)
export const organizationMembersTableSQLite = sqliteTable('organization_members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull().default('member'), // owner | admin | member | viewer
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  orgIdIdx: sqliteIndex('organization_members_org_id_idx').on(table.organizationId),
  userIdIdx: sqliteIndex('organization_members_user_id_idx').on(table.userId),
  orgUserIdx: sqliteIndex('organization_members_org_user_idx').on(table.organizationId, table.userId),
}));

export type Organization = typeof organizationsTableSQLite.$inferSelect;
export type NewOrganization = typeof organizationsTableSQLite.$inferInsert;
export type OrganizationMember = typeof organizationMembersTableSQLite.$inferSelect;
export type NewOrganizationMember = typeof organizationMembersTableSQLite.$inferInsert;
export type Workflow = typeof workflowsTableSQLite.$inferSelect;
export type NewWorkflow = typeof workflowsTableSQLite.$inferInsert;
export type WorkflowRun = typeof workflowRunsTableSQLite.$inferSelect;
export type NewWorkflowRun = typeof workflowRunsTableSQLite.$inferInsert;
export type UserCredential = typeof userCredentialsTableSQLite.$inferSelect;
export type NewUserCredential = typeof userCredentialsTableSQLite.$inferInsert;
