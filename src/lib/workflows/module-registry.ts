import { logger } from '@/lib/logger';

/**
 * Module Registry
 *
 * Generates documentation for all available modules to provide context to LLMs
 * for workflow generation.
 */

export interface ModuleFunction {
  name: string;
  description: string;
  signature: string;
  example?: string;
}

export interface ModuleCategory {
  name: string;
  modules: Array<{
    name: string;
    functions: ModuleFunction[];
  }>;
}

/**
 * Get all available modules organized by category
 */
export function getModuleRegistry(): ModuleCategory[] {
  return [
    {
      name: 'Communication',
      modules: [
        {
          name: 'email',
          functions: [
            {
              name: 'sendEmail',
              description: 'Send an email using Resend',
              signature: 'sendEmail({ from, to, subject, html?, text?, cc?, bcc?, replyTo?, tags? })',
              example: 'await sendEmail({ from: "noreply@example.com", to: "user@example.com", subject: "Hello", html: "<p>Hi!</p>" })',
            },
            {
              name: 'sendTextEmail',
              description: 'Send simple text email',
              signature: 'sendTextEmail(from, to, subject, text)',
            },
            {
              name: 'sendHtmlEmail',
              description: 'Send HTML email',
              signature: 'sendHtmlEmail(from, to, subject, html)',
            },
          ],
        },
        {
          name: 'slack',
          functions: [
            {
              name: 'postMessage',
              description: 'Post message to Slack channel',
              signature: 'postMessage({ channel, text, blocks?, threadTs?, username?, iconEmoji?, iconUrl? })',
              example: 'await postMessage({ channel: "#general", text: "Hello!" })',
            },
            {
              name: 'sendText',
              description: 'Send simple text message to Slack',
              signature: 'sendText(channel, text)',
            },
            {
              name: 'uploadFile',
              description: 'Upload file to Slack',
              signature: 'uploadFile(channel, file, filename, title?)',
            },
            {
              name: 'addReaction',
              description: 'React to Slack message',
              signature: 'addReaction(channel, timestamp, emoji)',
            },
          ],
        },
        {
          name: 'discord',
          functions: [
            {
              name: 'sendMessage',
              description: 'Send message to Discord channel',
              signature: 'sendMessage({ channelId, content?, embeds? })',
            },
            {
              name: 'sendText',
              description: 'Send simple text to Discord',
              signature: 'sendText(channelId, content)',
            },
            {
              name: 'sendEmbed',
              description: 'Send rich embed to Discord',
              signature: 'sendEmbed(channelId, { title?, description?, color?, fields?, footer?, timestamp? })',
            },
            {
              name: 'sendFile',
              description: 'Send file to Discord',
              signature: 'sendFile(channelId, file, filename, content?)',
            },
            {
              name: 'addReaction',
              description: 'React to Discord message',
              signature: 'addReaction(channelId, messageId, emoji)',
            },
          ],
        },
        {
          name: 'telegram',
          functions: [
            {
              name: 'sendMessage',
              description: 'Send Telegram message',
              signature: 'sendMessage({ chatId, text, parseMode?, disableWebPagePreview?, disableNotification?, replyToMessageId? })',
            },
            {
              name: 'sendText',
              description: 'Send simple text message',
              signature: 'sendText(chatId, text)',
            },
            {
              name: 'sendMarkdown',
              description: 'Send Markdown formatted message',
              signature: 'sendMarkdown(chatId, text)',
            },
            {
              name: 'sendHtml',
              description: 'Send HTML formatted message',
              signature: 'sendHtml(chatId, text)',
            },
            {
              name: 'sendPhoto',
              description: 'Send photo via Telegram',
              signature: 'sendPhoto(chatId, photo, caption?, parseMode?)',
            },
            {
              name: 'sendDocument',
              description: 'Send document/file',
              signature: 'sendDocument(chatId, document, filename?, caption?)',
            },
            {
              name: 'editMessageText',
              description: 'Edit message text',
              signature: 'editMessageText(chatId, messageId, text, parseMode?)',
            },
            {
              name: 'deleteMessage',
              description: 'Delete message',
              signature: 'deleteMessage(chatId, messageId)',
            },
            {
              name: 'sendToChannel',
              description: 'Send to Telegram channel',
              signature: 'sendToChannel(channelUsername, text, parseMode?)',
            },
          ],
        },
      ],
    },
    {
      name: 'Social Media',
      modules: [
        {
          name: 'twitter',
          functions: [
            {
              name: 'postTweet',
              description: 'Post a tweet to Twitter/X',
              signature: 'postTweet(text)',
              example: 'await postTweet("Hello Twitter!")',
            },
            {
              name: 'createThread',
              description: 'Post a Twitter thread (chained replies)',
              signature: 'createThread(tweets)',
              example: 'await createThread(["First tweet", "Second tweet", "Third tweet"])',
            },
            {
              name: 'replyToTweet',
              description: 'Reply to a specific tweet',
              signature: 'replyToTweet(tweetId, text)',
            },
            {
              name: 'getUserTimeline',
              description: 'Get user timeline tweets',
              signature: 'getUserTimeline(userId, maxResults?)',
            },
            {
              name: 'searchTweets',
              description: 'Search for tweets',
              signature: 'searchTweets(query, maxResults?)',
            },
          ],
        },
        {
          name: 'reddit',
          functions: [
            {
              name: 'submitPost',
              description: 'Submit post to Reddit',
              signature: 'submitPost({ subreddit, title, text?, url?, flairId?, sendReplies? })',
            },
            {
              name: 'commentOnPost',
              description: 'Comment on a Reddit post',
              signature: 'commentOnPost(postId, text)',
            },
            {
              name: 'replyToComment',
              description: 'Reply to a comment',
              signature: 'replyToComment(commentId, text)',
            },
            {
              name: 'getSubredditPosts',
              description: 'Get posts from subreddit',
              signature: 'getSubredditPosts(subreddit, sort?, limit?)',
              example: 'await getSubredditPosts("technology", "hot", 25)',
            },
            {
              name: 'searchPosts',
              description: 'Search Reddit posts',
              signature: 'searchPosts(query, subreddit?, limit?)',
            },
            {
              name: 'upvotePost',
              description: 'Upvote a post',
              signature: 'upvotePost(postId)',
            },
            {
              name: 'downvotePost',
              description: 'Downvote a post',
              signature: 'downvotePost(postId)',
            },
          ],
        },
        {
          name: 'youtube',
          functions: [
            {
              name: 'getVideoComments',
              description: 'Get comments for a video',
              signature: 'getVideoComments(videoId, maxResults?)',
            },
            {
              name: 'replyToComment',
              description: 'Reply to a YouTube comment',
              signature: 'replyToComment(commentId, text)',
            },
            {
              name: 'postComment',
              description: 'Post top-level comment on video',
              signature: 'postComment(videoId, text, channelId)',
            },
            {
              name: 'deleteComment',
              description: 'Delete a comment',
              signature: 'deleteComment(commentId)',
            },
            {
              name: 'getRecentVideos',
              description: 'Get recent videos from channel',
              signature: 'getRecentVideos(channelId, maxResults?, publishedAfter?)',
            },
            {
              name: 'getOurChannelId',
              description: 'Get authenticated channel ID',
              signature: 'getOurChannelId()',
            },
            {
              name: 'getVideoDetails',
              description: 'Get video details',
              signature: 'getVideoDetails(videoId)',
            },
            {
              name: 'searchVideos',
              description: 'Search for videos',
              signature: 'searchVideos(query, maxResults?)',
            },
            {
              name: 'getChannelDetails',
              description: 'Get channel details',
              signature: 'getChannelDetails(channelId?)',
            },
            {
              name: 'markCommentAsSpam',
              description: 'Mark comment as spam',
              signature: 'markCommentAsSpam(commentId)',
            },
            {
              name: 'setCommentModerationStatus',
              description: 'Set comment moderation status',
              signature: 'setCommentModerationStatus(commentId, status)',
            },
            {
              name: 'getComment',
              description: 'Get comment by ID',
              signature: 'getComment(commentId)',
            },
            {
              name: 'getYouTubeAuthUrl',
              description: 'Generate OAuth URL for setup',
              signature: 'getYouTubeAuthUrl()',
            },
            {
              name: 'getTokensFromCode',
              description: 'Exchange auth code for tokens',
              signature: 'getTokensFromCode(code)',
            },
          ],
        },
        {
          name: 'instagram',
          functions: [
            {
              name: 'replyToInstagramComment',
              description: 'Reply to Instagram comment',
              signature: 'replyToInstagramComment(commentId, message)',
            },
            {
              name: 'getInstagramComments',
              description: 'Get comments on media post',
              signature: 'getInstagramComments(mediaId)',
            },
            {
              name: 'sendInstagramDM',
              description: 'Send Instagram direct message',
              signature: 'sendInstagramDM(recipientId, message)',
            },
            {
              name: 'replyToInstagramDM',
              description: 'Reply to Instagram DM',
              signature: 'replyToInstagramDM(senderId, message)',
            },
            {
              name: 'getInstagramMedia',
              description: 'Get Instagram posts',
              signature: 'getInstagramMedia(limit?)',
            },
          ],
        },
      ],
    },
    {
      name: 'Data',
      modules: [
        {
          name: 'database',
          functions: [
            {
              name: 'query',
              description: 'Query database with WHERE conditions',
              signature: 'query({ table, select?, where?, limit? })',
              example: 'await query({ table: "tweet_replies", where: { status: "posted" } })',
            },
            {
              name: 'queryWhereIn',
              description: 'Query database with WHERE IN condition',
              signature: 'queryWhereIn({ table, column, values, select? })',
              example: 'await queryWhereIn({ table: "tweet_replies", column: "original_tweet_id", values: ["123", "456"] })',
            },
            {
              name: 'insert',
              description: 'Insert record(s) into database',
              signature: 'insert({ table, data })',
              example: 'await insert({ table: "tweet_replies", data: { original_tweet_id: "123", our_reply_text: "Hello!" } })',
            },
            {
              name: 'update',
              description: 'Update records in database',
              signature: 'update({ table, data, where })',
              example: 'await update({ table: "tweet_replies", data: { status: "archived" }, where: { original_tweet_id: "123" } })',
            },
            {
              name: 'deleteRecords',
              description: 'Delete records from database',
              signature: 'deleteRecords({ table, where })',
            },
            {
              name: 'count',
              description: 'Count records in table',
              signature: 'count({ table, where? })',
              example: 'await count({ table: "tweet_replies", where: { status: "posted" } })',
            },
            {
              name: 'exists',
              description: 'Check if record exists',
              signature: 'exists({ table, where })',
              example: 'await exists({ table: "tweet_replies", where: { original_tweet_id: "123" } })',
            },
            {
              name: 'getOne',
              description: 'Get single record (first match)',
              signature: 'getOne({ table, where, select? })',
            },
          ],
        },
        {
          name: 'mongodb',
          functions: [
            {
              name: 'find',
              description: 'Find documents in MongoDB',
              signature: 'find(uri, database, collection, filter?, options?)',
              example: 'await find("mongodb://...", "mydb", "users", { age: { $gt: 18 } })',
            },
            {
              name: 'findOne',
              description: 'Find one document',
              signature: 'findOne(uri, database, collection, filter)',
            },
            {
              name: 'insertOne',
              description: 'Insert one document',
              signature: 'insertOne(uri, database, collection, document)',
            },
            {
              name: 'insertMany',
              description: 'Insert multiple documents',
              signature: 'insertMany(uri, database, collection, documents)',
            },
            {
              name: 'updateOne',
              description: 'Update one document',
              signature: 'updateOne(uri, database, collection, filter, update)',
            },
            {
              name: 'updateMany',
              description: 'Update multiple documents',
              signature: 'updateMany(uri, database, collection, filter, update)',
            },
            {
              name: 'deleteOne',
              description: 'Delete one document',
              signature: 'deleteOne(uri, database, collection, filter)',
            },
            {
              name: 'deleteMany',
              description: 'Delete multiple documents',
              signature: 'deleteMany(uri, database, collection, filter)',
            },
            {
              name: 'count',
              description: 'Count documents',
              signature: 'count(uri, database, collection, filter?)',
            },
            {
              name: 'aggregate',
              description: 'Run aggregation pipeline',
              signature: 'aggregate(uri, database, collection, pipeline)',
            },
            {
              name: 'createIndex',
              description: 'Create index',
              signature: 'createIndex(uri, database, collection, keys, options?)',
            },
            {
              name: 'dropCollection',
              description: 'Drop collection',
              signature: 'dropCollection(uri, database, collection)',
            },
          ],
        },
        {
          name: 'postgresql',
          functions: [
            {
              name: 'query',
              description: 'Execute SQL query',
              signature: 'query(connection, sql, params?)',
              example: 'await query({ host, user, password, database }, "SELECT * FROM users WHERE id = $1", [123])',
            },
            {
              name: 'select',
              description: 'Select rows from table',
              signature: 'select(connection, table, { columns?, where?, orderBy?, limit?, offset? })',
            },
            {
              name: 'insert',
              description: 'Insert row into table',
              signature: 'insert(connection, table, data)',
            },
            {
              name: 'insertMany',
              description: 'Insert multiple rows',
              signature: 'insertMany(connection, table, rows)',
            },
            {
              name: 'update',
              description: 'Update rows in table',
              signature: 'update(connection, table, data, where)',
            },
            {
              name: 'deleteRows',
              description: 'Delete rows from table',
              signature: 'deleteRows(connection, table, where)',
            },
            {
              name: 'transaction',
              description: 'Execute queries in transaction',
              signature: 'transaction(connection, queries)',
            },
            {
              name: 'count',
              description: 'Count rows in table',
              signature: 'count(connection, table, where?)',
            },
            {
              name: 'tableExists',
              description: 'Check if table exists',
              signature: 'tableExists(connection, table)',
            },
            {
              name: 'queryJson',
              description: 'Query JSONB columns',
              signature: 'queryJson(connection, table, jsonColumn, jsonPath, value?)',
            },
          ],
        },
        {
          name: 'mysql',
          functions: [
            {
              name: 'query',
              description: 'Execute SQL query',
              signature: 'query(connection, sql, params?)',
            },
            {
              name: 'select',
              description: 'Select rows from table',
              signature: 'select(connection, table, { columns?, where?, orderBy?, limit?, offset? })',
            },
            {
              name: 'insert',
              description: 'Insert row into table',
              signature: 'insert(connection, table, data)',
            },
            {
              name: 'insertMany',
              description: 'Insert multiple rows',
              signature: 'insertMany(connection, table, rows)',
            },
            {
              name: 'update',
              description: 'Update rows in table',
              signature: 'update(connection, table, data, where)',
            },
            {
              name: 'deleteRows',
              description: 'Delete rows from table',
              signature: 'deleteRows(connection, table, where)',
            },
            {
              name: 'transaction',
              description: 'Execute queries in transaction',
              signature: 'transaction(connection, queries)',
            },
            {
              name: 'count',
              description: 'Count rows in table',
              signature: 'count(connection, table, where?)',
            },
            {
              name: 'tableExists',
              description: 'Check if table exists',
              signature: 'tableExists(connection, table)',
            },
          ],
        },
        {
          name: 'notion',
          functions: [
            {
              name: 'queryDatabase',
              description: 'Query Notion database',
              signature: 'queryDatabase({ databaseId, filter?, sorts?, pageSize? })',
            },
            {
              name: 'createPage',
              description: 'Create page in database',
              signature: 'createPage({ databaseId, properties, children? })',
            },
            {
              name: 'updatePage',
              description: 'Update page properties',
              signature: 'updatePage(pageId, properties)',
            },
            {
              name: 'retrievePage',
              description: 'Retrieve page by ID',
              signature: 'retrievePage(pageId)',
            },
            {
              name: 'retrievePageContent',
              description: 'Retrieve page content blocks',
              signature: 'retrievePageContent(pageId)',
            },
            {
              name: 'appendToPage',
              description: 'Append content to page',
              signature: 'appendToPage(pageId, blocks)',
            },
          ],
        },
        {
          name: 'airtable',
          functions: [
            {
              name: 'selectRecords',
              description: 'Query Airtable records',
              signature: 'selectRecords({ baseId, tableName, filterByFormula?, maxRecords?, sort?, view? })',
            },
            {
              name: 'createRecord',
              description: 'Create Airtable record',
              signature: 'createRecord(baseId, tableName, fields)',
            },
            {
              name: 'createRecords',
              description: 'Create multiple records',
              signature: 'createRecords(baseId, tableName, records)',
            },
            {
              name: 'updateRecord',
              description: 'Update Airtable record',
              signature: 'updateRecord(baseId, tableName, recordId, fields)',
            },
            {
              name: 'updateRecords',
              description: 'Update multiple records',
              signature: 'updateRecords(baseId, tableName, records)',
            },
            {
              name: 'deleteRecord',
              description: 'Delete Airtable record',
              signature: 'deleteRecord(baseId, tableName, recordId)',
            },
            {
              name: 'deleteRecords',
              description: 'Delete multiple records',
              signature: 'deleteRecords(baseId, tableName, recordIds)',
            },
            {
              name: 'findRecord',
              description: 'Find record by field value',
              signature: 'findRecord(baseId, tableName, fieldName, value)',
            },
          ],
        },
        {
          name: 'google-sheets',
          functions: [
            {
              name: 'getRows',
              description: 'Get rows from Google Sheet',
              signature: 'getRows(spreadsheetId, sheetTitle?, options?)',
            },
            {
              name: 'addRow',
              description: 'Add row to Google Sheet',
              signature: 'addRow(spreadsheetId, data, sheetTitle?)',
            },
            {
              name: 'addRows',
              description: 'Add multiple rows',
              signature: 'addRows(spreadsheetId, rows, sheetTitle?)',
            },
            {
              name: 'updateRow',
              description: 'Update row by index',
              signature: 'updateRow(spreadsheetId, rowIndex, data, sheetTitle?)',
            },
            {
              name: 'deleteRow',
              description: 'Delete row by index',
              signature: 'deleteRow(spreadsheetId, rowIndex, sheetTitle?)',
            },
            {
              name: 'clearSheet',
              description: 'Clear all rows (keep headers)',
              signature: 'clearSheet(spreadsheetId, sheetTitle?)',
            },
            {
              name: 'getCellValue',
              description: 'Get cell value by address',
              signature: 'getCellValue(spreadsheetId, cellAddress, sheetTitle?)',
            },
            {
              name: 'setCellValue',
              description: 'Set cell value by address',
              signature: 'setCellValue(spreadsheetId, cellAddress, value, sheetTitle?)',
            },
            {
              name: 'queryRows',
              description: 'Query rows with filter',
              signature: 'queryRows(spreadsheetId, filterColumn, filterValue, sheetTitle?)',
            },
          ],
        },
      ],
    },
    {
      name: 'AI',
      modules: [
        {
          name: 'ai-sdk',
          functions: [
            {
              name: 'generateText',
              description: 'Generate text with any AI model (OpenAI or Anthropic)',
              signature: 'generateText({ prompt, systemPrompt?, model?, provider?, temperature?, maxTokens?, apiKey? })',
              example: 'await generateText({ prompt: "Write a tweet about AI", model: "gpt-4o-mini", provider: "openai", apiKey: "{{user.openai}}" })',
            },
            {
              name: 'chat',
              description: 'Chat with conversation history (supports multiple providers)',
              signature: 'chat({ messages, model?, provider?, temperature?, maxTokens?, apiKey? })',
              example: 'await chat({ messages: [{ role: "user", content: "Hello" }], model: "claude-3-5-sonnet-20241022", provider: "anthropic" })',
            },
            {
              name: 'streamGeneration',
              description: 'Stream text generation for real-time responses',
              signature: 'streamGeneration({ prompt, systemPrompt?, model?, provider?, temperature?, maxTokens?, apiKey?, onChunk? })',
            },
            {
              name: 'generateJSON',
              description: 'Generate structured JSON output with schema validation',
              signature: 'generateJSON({ prompt, systemPrompt?, model?, provider?, temperature?, maxTokens?, apiKey?, schema })',
            },
            {
              name: 'generateFast',
              description: 'Fast generation with GPT-4o-mini',
              signature: 'generateFast(prompt, systemPrompt?, apiKey?)',
              example: 'await generateFast("Write a short summary", undefined, "{{user.openai}}")',
            },
            {
              name: 'generateQuality',
              description: 'High quality generation with GPT-4o',
              signature: 'generateQuality(prompt, systemPrompt?, apiKey?)',
            },
            {
              name: 'generateClaudeFast',
              description: 'Fast generation with Claude Haiku',
              signature: 'generateClaudeFast(prompt, systemPrompt?, apiKey?)',
            },
            {
              name: 'generateClaudeQuality',
              description: 'High quality generation with Claude Sonnet',
              signature: 'generateClaudeQuality(prompt, systemPrompt?, apiKey?)',
            },
          ],
        },
      ],
    },
    {
      name: 'Utilities',
      modules: [
        {
          name: 'http',
          functions: [
            {
              name: 'httpRequest',
              description: 'Make HTTP request with custom method',
              signature: 'httpRequest(config)',
              example: 'await httpRequest({ url: "https://api.example.com", method: "GET", headers: { "Authorization": "Bearer token" } })',
            },
            {
              name: 'httpGet',
              description: 'Make HTTP GET request',
              signature: 'httpGet(url, options?)',
              example: 'await httpGet("https://api.example.com/data", { headers: { "Authorization": "Bearer token" } })',
            },
            {
              name: 'httpPost',
              description: 'Make HTTP POST request',
              signature: 'httpPost(url, data, options?)',
              example: 'await httpPost("https://api.example.com/items", { name: "Item" })',
            },
            {
              name: 'httpPut',
              description: 'Make HTTP PUT request',
              signature: 'httpPut(url, data, options?)',
              example: 'await httpPut("https://api.example.com/items/123", { name: "Updated" })',
            },
            {
              name: 'httpPatch',
              description: 'Make HTTP PATCH request',
              signature: 'httpPatch(url, data, options?)',
              example: 'await httpPatch("https://api.example.com/items/123", { name: "Patched" })',
            },
            {
              name: 'httpDelete',
              description: 'Make HTTP DELETE request',
              signature: 'httpDelete(url, options?)',
              example: 'await httpDelete("https://api.example.com/items/123")',
            },
          ],
        },
        {
          name: 'rss',
          functions: [
            {
              name: 'parseFeed',
              description: 'Parse RSS/Atom feed',
              signature: 'parseFeed(url)',
              example: 'await parseFeed("https://example.com/feed.xml")',
            },
            {
              name: 'parseFeedString',
              description: 'Parse RSS feed from string',
              signature: 'parseFeedString(feedString)',
            },
            {
              name: 'getFeedItems',
              description: 'Get all feed items',
              signature: 'getFeedItems(url)',
            },
            {
              name: 'getLatestItems',
              description: 'Get N latest items from feed',
              signature: 'getLatestItems(url, limit)',
            },
            {
              name: 'searchFeedItems',
              description: 'Search feed items by keyword',
              signature: 'searchFeedItems(url, keyword, searchIn?)',
              example: 'await searchFeedItems("https://example.com/feed.xml", "AI", ["title", "content"])',
            },
            {
              name: 'filterItemsByDate',
              description: 'Filter feed items by date range',
              signature: 'filterItemsByDate(url, afterDate, beforeDate?)',
            },
            {
              name: 'getFeedMetadata',
              description: 'Get feed metadata (title, description, etc)',
              signature: 'getFeedMetadata(url)',
            },
            {
              name: 'getFeedCategories',
              description: 'Extract unique categories from feed',
              signature: 'getFeedCategories(url)',
            },
            {
              name: 'getItemsByCategory',
              description: 'Get items by category',
              signature: 'getItemsByCategory(url, category)',
            },
            {
              name: 'getItemsByAuthor',
              description: 'Get items by author',
              signature: 'getItemsByAuthor(url, author)',
            },
          ],
        },
        {
          name: 'scraper',
          functions: [
            {
              name: 'fetchHtml',
              description: 'Fetch and parse HTML from URL',
              signature: 'fetchHtml(url)',
            },
            {
              name: 'parseHtml',
              description: 'Parse HTML string to Cheerio object',
              signature: 'parseHtml(html)',
            },
            {
              name: 'extractText',
              description: 'Extract text using CSS selector',
              signature: 'extractText($, selector)',
            },
            {
              name: 'extractLinks',
              description: 'Extract all links from page',
              signature: 'extractLinks($, baseUrl?, selector?)',
            },
            {
              name: 'extractImages',
              description: 'Extract all images from page',
              signature: 'extractImages($, baseUrl?, selector?)',
              example: 'extractImages($, "https://example.com", "img")',
            },
            {
              name: 'extractMetaTags',
              description: 'Extract meta tags (title, description, OG, Twitter)',
              signature: 'extractMetaTags($)',
            },
            {
              name: 'extractTable',
              description: 'Extract table data to array of objects',
              signature: 'extractTable($, selector)',
              example: 'extractTable($, "table.data") → [{ column1: "value1", column2: "value2" }]',
            },
            {
              name: 'extractAttributes',
              description: 'Extract attribute values from elements',
              signature: 'extractAttributes($, selector, attribute)',
              example: 'extractAttributes($, "a", "href") → ["url1", "url2"]',
            },
            {
              name: 'elementExists',
              description: 'Check if element exists',
              signature: 'elementExists($, selector)',
            },
            {
              name: 'countElements',
              description: 'Count matching elements',
              signature: 'countElements($, selector)',
            },
            {
              name: 'extractStructuredData',
              description: 'Extract JSON-LD structured data',
              signature: 'extractStructuredData($)',
            },
          ],
        },
        {
          name: 'datetime',
          functions: [
            {
              name: 'now',
              description: 'Get current date/time',
              signature: 'now()',
              example: 'const now = await now()',
            },
            {
              name: 'formatDate',
              description: 'Format date to string',
              signature: 'formatDate(date, formatString)',
              example: 'formatDate(new Date(), "yyyy-MM-dd") → "2025-11-01"',
            },
            {
              name: 'addDays',
              description: 'Add days to date',
              signature: 'addDays(date, days)',
              example: 'addDays(new Date(), 7) → Date 7 days in future',
            },
            {
              name: 'addHours',
              description: 'Add hours to date',
              signature: 'addHours(date, hours)',
            },
            {
              name: 'addMinutes',
              description: 'Add minutes to date',
              signature: 'addMinutes(date, minutes)',
            },
            {
              name: 'subDays',
              description: 'Subtract days from date',
              signature: 'subDays(date, days)',
              example: 'subDays(new Date(), 7) → Date 7 days ago',
            },
            {
              name: 'subHours',
              description: 'Subtract hours from date',
              signature: 'subHours(date, hours)',
              example: 'subHours(new Date(), 24) → Date 24 hours ago',
            },
            {
              name: 'subMinutes',
              description: 'Subtract minutes from date',
              signature: 'subMinutes(date, minutes)',
            },
            {
              name: 'fromISO',
              description: 'Parse ISO 8601 string to Date',
              signature: 'fromISO(isoString)',
            },
            {
              name: 'toISO',
              description: 'Format Date to ISO 8601 string',
              signature: 'toISO(date)',
            },
          ],
        },
        {
          name: 'string-utils',
          functions: [
            {
              name: 'toSlug',
              description: 'Convert string to URL-friendly slug',
              signature: 'toSlug(text, options?)',
              example: 'toSlug("Hello World!") → "hello-world"',
            },
            {
              name: 'toCamelCase',
              description: 'Convert string to camelCase',
              signature: 'toCamelCase(str)',
              example: 'toCamelCase("hello world") → "helloWorld"',
            },
            {
              name: 'toPascalCase',
              description: 'Convert string to PascalCase',
              signature: 'toPascalCase(str)',
              example: 'toPascalCase("hello world") → "HelloWorld"',
            },
            {
              name: 'toSnakeCase',
              description: 'Convert string to snake_case',
              signature: 'toSnakeCase(str)',
              example: 'toSnakeCase("helloWorld") → "hello_world"',
            },
            {
              name: 'toKebabCase',
              description: 'Convert string to kebab-case',
              signature: 'toKebabCase(str)',
              example: 'toKebabCase("helloWorld") → "hello-world"',
            },
            {
              name: 'truncate',
              description: 'Truncate string to max length',
              signature: 'truncate(str, maxLength, suffix?)',
              example: 'truncate("Hello World", 8) → "Hello..."',
            },
            {
              name: 'truncateWords',
              description: 'Truncate string to max words',
              signature: 'truncateWords(str, maxWords, suffix?)',
              example: 'truncateWords("Hello beautiful world", 2) → "Hello beautiful..."',
            },
            {
              name: 'stripHtml',
              description: 'Remove HTML tags from string',
              signature: 'stripHtml(str)',
              example: 'stripHtml("<p>Hello</p>") → "Hello"',
            },
            {
              name: 'escapeHtml',
              description: 'Escape HTML special characters',
              signature: 'escapeHtml(str)',
              example: 'escapeHtml("<script>") → "&lt;script&gt;"',
            },
            {
              name: 'capitalize',
              description: 'Capitalize first letter of string',
              signature: 'capitalize(str)',
              example: 'capitalize("hello") → "Hello"',
            },
            {
              name: 'capitalizeWords',
              description: 'Capitalize first letter of each word',
              signature: 'capitalizeWords(str)',
              example: 'capitalizeWords("hello world") → "Hello World"',
            },
            {
              name: 'reverse',
              description: 'Reverse a string',
              signature: 'reverse(str)',
              example: 'reverse("hello") → "olleh"',
            },
            {
              name: 'isEmail',
              description: 'Check if string is valid email',
              signature: 'isEmail(str)',
              example: 'isEmail("user@example.com") → true',
            },
            {
              name: 'isUrl',
              description: 'Check if string is valid URL',
              signature: 'isUrl(str)',
              example: 'isUrl("https://example.com") → true',
            },
            {
              name: 'extractUrls',
              description: 'Extract all URLs from text',
              signature: 'extractUrls(str)',
              example: 'extractUrls("Visit https://example.com") → ["https://example.com"]',
            },
            {
              name: 'extractEmails',
              description: 'Extract all email addresses from text',
              signature: 'extractEmails(str)',
              example: 'extractEmails("Contact us at info@example.com") → ["info@example.com"]',
            },
            {
              name: 'normalizeWhitespace',
              description: 'Remove extra whitespace',
              signature: 'normalizeWhitespace(str)',
              example: 'normalizeWhitespace("hello   world") → "hello world"',
            },
            {
              name: 'wordCount',
              description: 'Count words in string',
              signature: 'wordCount(str)',
              example: 'wordCount("hello world") → 2',
            },
            {
              name: 'charCount',
              description: 'Count characters (excluding whitespace by default)',
              signature: 'charCount(str, includeSpaces?)',
              example: 'charCount("hello world") → 10',
            },
            {
              name: 'template',
              description: 'Simple template string replacement',
              signature: 'template(str, variables)',
              example: 'template("Hello {{name}}", { name: "World" }) → "Hello World"',
            },
            {
              name: 'removeAccents',
              description: 'Remove accents/diacritics from string',
              signature: 'removeAccents(str)',
              example: 'removeAccents("café") → "cafe"',
            },
            {
              name: 'randomString',
              description: 'Generate random string',
              signature: 'randomString(length, chars?)',
              example: 'randomString(8) → "aB3dE9fG"',
            },
            {
              name: 'mask',
              description: 'Mask sensitive data (e.g., credit cards, emails)',
              signature: 'mask(str, visibleChars?, maskChar?)',
              example: 'mask("john@example.com", 4) → "john****example.com"',
            },
            {
              name: 'concat',
              description: 'Concatenate multiple strings together',
              signature: 'concat(strings, separator?)',
              example: 'concat(["Hello", "World"], " ") → "Hello World"',
            },
          ],
        },
        {
          name: 'array-utils',
          functions: [
            {
              name: 'first',
              description: 'Get first N items from array',
              signature: 'first(array, count?)',
              example: 'first([1,2,3], 2) → [1,2]',
            },
            {
              name: 'last',
              description: 'Get last N items from array',
              signature: 'last(array, count?)',
            },
            {
              name: 'unique',
              description: 'Get unique values from array',
              signature: 'unique(array)',
            },
            {
              name: 'chunk',
              description: 'Split array into chunks of size N',
              signature: 'chunk(array, size)',
            },
            {
              name: 'shuffle',
              description: 'Randomly shuffle array',
              signature: 'shuffle(array)',
            },
            {
              name: 'sortBy',
              description: 'Sort array of objects by property',
              signature: 'sortBy(array, key, order?)',
            },
            {
              name: 'groupBy',
              description: 'Group array of objects by property',
              signature: 'groupBy(array, key)',
            },
            {
              name: 'sum',
              description: 'Sum numbers in array',
              signature: 'sum(array)',
            },
            {
              name: 'average',
              description: 'Calculate average of numbers',
              signature: 'average(array)',
            },
            {
              name: 'pluck',
              description: 'Extract property values from objects',
              signature: 'pluck(array, key)',
              example: 'pluck([{id:1},{id:2}], "id") → [1,2]',
            },
            {
              name: 'flatten',
              description: 'Flatten nested arrays',
              signature: 'flatten(array, depth?)',
              example: 'flatten([[1,2],[3,4]]) → [1,2,3,4]',
            },
            {
              name: 'compact',
              description: 'Remove falsy values from array',
              signature: 'compact(array)',
              example: 'compact([0, 1, false, 2, "", 3]) → [1, 2, 3]',
            },
            {
              name: 'intersection',
              description: 'Get common elements from arrays',
              signature: 'intersection(...arrays)',
              example: 'intersection([1,2,3], [2,3,4]) → [2,3]',
            },
            {
              name: 'union',
              description: 'Combine arrays removing duplicates',
              signature: 'union(...arrays)',
              example: 'union([1,2], [2,3]) → [1,2,3]',
            },
            {
              name: 'difference',
              description: 'Get elements in first array but not second',
              signature: 'difference(array1, array2)',
              example: 'difference([1,2,3], [2,3,4]) → [1]',
            },
            {
              name: 'min',
              description: 'Get minimum value from array',
              signature: 'min(array)',
              example: 'min([3, 1, 4, 1, 5]) → 1',
            },
            {
              name: 'max',
              description: 'Get maximum value from array',
              signature: 'max(array)',
              example: 'max([3, 1, 4, 1, 5]) → 5',
            },
            {
              name: 'random',
              description: 'Get random element from array',
              signature: 'random(array)',
              example: 'random([1,2,3]) → 2 (random)',
            },
            {
              name: 'sample',
              description: 'Get N random elements from array',
              signature: 'sample(array, count)',
              example: 'sample([1,2,3,4,5], 2) → [2, 4] (random)',
            },
            {
              name: 'sortNumbers',
              description: 'Sort array of numbers',
              signature: 'sortNumbers(array, order?)',
              example: 'sortNumbers([3,1,2]) → [1,2,3]',
            },
            {
              name: 'sortStrings',
              description: 'Sort array of strings',
              signature: 'sortStrings(array, order?)',
              example: 'sortStrings(["c","a","b"]) → ["a","b","c"]',
            },
            {
              name: 'countBy',
              description: 'Count occurrences of each value',
              signature: 'countBy(array)',
              example: 'countBy([1,1,2,2,2,3]) → {1:2, 2:3, 3:1}',
            },
          ],
        },
        {
          name: 'batching',
          functions: [
            {
              name: 'paginate',
              description: 'Get a specific page from array of items',
              signature: 'paginate(items, pageSize, pageNumber)',
              example: 'paginate([1,2,3,4,5], 2, 2) → [3,4]',
            },
            {
              name: 'createBatches',
              description: 'Split array into batches of specified size',
              signature: 'createBatches(items, batchSize)',
              example: 'createBatches([1,2,3,4,5], 2) → [[1,2], [3,4], [5]]',
            },
            {
              name: 'processBatchesSequentially',
              description: 'Process batches with delays between each (for rate limiting)',
              signature: 'processBatchesSequentially(batches, delayMs)',
              example: 'await processBatchesSequentially([[1,2], [3,4]], 1000) → Wait 1s between batches',
            },
            {
              name: 'chunkArray',
              description: 'Alias for createBatches - split array into chunks',
              signature: 'chunkArray(array, size)',
              example: 'chunkArray([1,2,3,4,5], 2) → [[1,2], [3,4], [5]]',
            },
            {
              name: 'getAllPages',
              description: 'Split array into all pages of given size',
              signature: 'getAllPages(items, pageSize)',
              example: 'getAllPages([1,2,3,4,5], 2) → [[1,2], [3,4], [5]]',
            },
            {
              name: 'getPaginationMetadata',
              description: 'Get pagination info (total pages, has next/previous)',
              signature: 'getPaginationMetadata(items, pageSize, pageNumber)',
              example: 'getPaginationMetadata([1,2,3,4,5], 2, 2) → { totalPages: 3, hasNextPage: true, ... }',
            },
            {
              name: 'paginateWithMetadata',
              description: 'Get page with metadata in one call',
              signature: 'paginateWithMetadata(items, pageSize, pageNumber)',
              example: 'paginateWithMetadata([1,2,3,4,5], 2, 2) → { items: [3,4], metadata: { ... } }',
            },
          ],
        },
        {
          name: 'filesystem',
          functions: [
            {
              name: 'readFile',
              description: 'Read file contents as string',
              signature: 'readFile(filePath, encoding?)',
              example: 'await readFile("/path/to/file.txt")',
            },
            {
              name: 'readFileBuffer',
              description: 'Read file contents as Buffer',
              signature: 'readFileBuffer(filePath)',
            },
            {
              name: 'writeFile',
              description: 'Write string content to file',
              signature: 'writeFile(filePath, content, encoding?)',
              example: 'await writeFile("/path/to/file.txt", "Hello World")',
            },
            {
              name: 'writeFileBuffer',
              description: 'Write Buffer to file',
              signature: 'writeFileBuffer(filePath, buffer)',
            },
            {
              name: 'appendFile',
              description: 'Append content to file',
              signature: 'appendFile(filePath, content, encoding?)',
            },
            {
              name: 'deleteFile',
              description: 'Delete file',
              signature: 'deleteFile(filePath)',
            },
            {
              name: 'fileExists',
              description: 'Check if file exists',
              signature: 'fileExists(filePath)',
              example: 'await fileExists("/path/to/file.txt") → true',
            },
            {
              name: 'getFileStats',
              description: 'Get file statistics',
              signature: 'getFileStats(filePath)',
              example: 'await getFileStats("/path/to/file.txt") → { size, isFile, created, ... }',
            },
            {
              name: 'copyFile',
              description: 'Copy file',
              signature: 'copyFile(sourcePath, destPath)',
            },
            {
              name: 'moveFile',
              description: 'Move/rename file',
              signature: 'moveFile(sourcePath, destPath)',
            },
            {
              name: 'createDirectory',
              description: 'Create directory',
              signature: 'createDirectory(dirPath, recursive?)',
            },
            {
              name: 'listDirectory',
              description: 'List directory contents',
              signature: 'listDirectory(dirPath, options?)',
              example: 'await listDirectory("/path/to/dir", { recursive: true })',
            },
            {
              name: 'deleteDirectory',
              description: 'Delete directory',
              signature: 'deleteDirectory(dirPath, recursive?)',
            },
            {
              name: 'copyDirectory',
              description: 'Copy directory',
              signature: 'copyDirectory(sourcePath, destPath)',
            },
            {
              name: 'getFileExtension',
              description: 'Get file extension',
              signature: 'getFileExtension(filePath)',
              example: 'getFileExtension("file.txt") → ".txt"',
            },
            {
              name: 'getFileName',
              description: 'Get file name without extension',
              signature: 'getFileName(filePath)',
              example: 'getFileName("/path/to/file.txt") → "file"',
            },
            {
              name: 'getDirectoryName',
              description: 'Get directory name',
              signature: 'getDirectoryName(filePath)',
              example: 'getDirectoryName("/path/to/file.txt") → "/path/to"',
            },
            {
              name: 'joinPaths',
              description: 'Join path segments',
              signature: 'joinPaths(...paths)',
              example: 'joinPaths("/path", "to", "file.txt") → "/path/to/file.txt"',
            },
            {
              name: 'resolvePath',
              description: 'Resolve absolute path',
              signature: 'resolvePath(...paths)',
            },
            {
              name: 'streamCopyFile',
              description: 'Stream copy file (for large files)',
              signature: 'streamCopyFile(sourcePath, destPath)',
            },
            {
              name: 'readFileLines',
              description: 'Read file as array of lines',
              signature: 'readFileLines(filePath)',
              example: 'await readFileLines("/path/to/file.txt") → ["line1", "line2"]',
            },
            {
              name: 'writeFileLines',
              description: 'Write array of lines to file',
              signature: 'writeFileLines(filePath, lines)',
            },
          ],
        },
        {
          name: 'csv',
          functions: [
            {
              name: 'parseCsv',
              description: 'Parse CSV string to array of objects',
              signature: 'parseCsv(csvString, options?)',
              example: 'parseCsv("name,age\\nJohn,30\\nJane,25") → [{name:"John",age:"30"},{name:"Jane",age:"25"}]',
            },
            {
              name: 'stringifyCsv',
              description: 'Generate CSV string from array of objects',
              signature: 'stringifyCsv(data, options?)',
              example: 'stringifyCsv([{name:"John",age:30}]) → "name,age\\nJohn,30"',
            },
            {
              name: 'parseCsvWithTransform',
              description: 'Parse CSV with custom transformations',
              signature: 'parseCsvWithTransform(csvString, transform, options?)',
            },
            {
              name: 'filterCsv',
              description: 'Filter CSV data',
              signature: 'filterCsv(data, predicate)',
              example: 'filterCsv(data, row => row.age > 25)',
            },
            {
              name: 'mapCsvColumns',
              description: 'Rename CSV columns',
              signature: 'mapCsvColumns(data, columnMap)',
              example: 'mapCsvColumns(data, { "old_name": "new_name" })',
            },
            {
              name: 'selectCsvColumns',
              description: 'Select specific CSV columns',
              signature: 'selectCsvColumns(data, columns)',
              example: 'selectCsvColumns(data, ["name", "age"])',
            },
            {
              name: 'sortCsv',
              description: 'Sort CSV data',
              signature: 'sortCsv(data, sortKey, direction?)',
              example: 'sortCsv(data, "age", "desc")',
            },
            {
              name: 'groupCsvBy',
              description: 'Group CSV data by key',
              signature: 'groupCsvBy(data, groupKey)',
              example: 'groupCsvBy(data, "category") → { "books": [...], "movies": [...] }',
            },
            {
              name: 'csvToJson',
              description: 'Convert CSV to JSON string',
              signature: 'csvToJson(csvString, options?)',
            },
            {
              name: 'jsonToCsv',
              description: 'Convert JSON string to CSV',
              signature: 'jsonToCsv(jsonString, options?)',
            },
          ],
        },
        {
          name: 'encryption',
          functions: [
            {
              name: 'hashSHA256',
              description: 'Hash data with SHA-256',
              signature: 'hashSHA256(data)',
              example: 'hashSHA256("hello") → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"',
            },
            {
              name: 'hashSHA512',
              description: 'Hash data with SHA-512',
              signature: 'hashSHA512(data)',
            },
            {
              name: 'hashMD5',
              description: 'Hash data with MD5',
              signature: 'hashMD5(data)',
            },
            {
              name: 'encodeBase64',
              description: 'Encode string to Base64',
              signature: 'encodeBase64(data)',
              example: 'encodeBase64("hello") → "aGVsbG8="',
            },
            {
              name: 'decodeBase64',
              description: 'Decode Base64 string',
              signature: 'decodeBase64(data)',
            },
            {
              name: 'encodeBase64Url',
              description: 'Encode string to URL-safe Base64',
              signature: 'encodeBase64Url(data)',
            },
            {
              name: 'decodeBase64Url',
              description: 'Decode URL-safe Base64',
              signature: 'decodeBase64Url(data)',
            },
            {
              name: 'generateUUID',
              description: 'Generate UUID v4',
              signature: 'generateUUID()',
              example: 'generateUUID() → "550e8400-e29b-41d4-a716-446655440000"',
            },
            {
              name: 'generateToken',
              description: 'Generate random secure token',
              signature: 'generateToken(bytes?)',
              example: 'generateToken(32) → "a1b2c3d4..."',
            },
            {
              name: 'generateRandomString',
              description: 'Generate random alphanumeric string',
              signature: 'generateRandomString(length, chars?)',
            },
            {
              name: 'generateChecksum',
              description: 'Generate checksum for data',
              signature: 'generateChecksum(data, algorithm?)',
            },
            {
              name: 'verifyChecksum',
              description: 'Verify data against checksum',
              signature: 'verifyChecksum(data, checksum, algorithm?)',
            },
            {
              name: 'generateAESKey',
              description: 'Generate AES encryption key',
              signature: 'generateAESKey(length?)',
            },
            {
              name: 'encryptAES',
              description: 'Encrypt data with AES',
              signature: 'encryptAES(data, options)',
            },
            {
              name: 'decryptAES',
              description: 'Decrypt data with AES',
              signature: 'decryptAES(encrypted, iv, options)',
            },
            {
              name: 'generateRSAKeyPair',
              description: 'Generate RSA key pair',
              signature: 'generateRSAKeyPair(modulusLength?)',
            },
            {
              name: 'encryptRSA',
              description: 'Encrypt data with RSA public key',
              signature: 'encryptRSA(data, publicKey)',
            },
            {
              name: 'decryptRSA',
              description: 'Decrypt data with RSA private key',
              signature: 'decryptRSA(encrypted, privateKey)',
            },
            {
              name: 'signData',
              description: 'Sign data with RSA private key',
              signature: 'signData(data, privateKey)',
            },
            {
              name: 'verifySignature',
              description: 'Verify signature with RSA public key',
              signature: 'verifySignature(data, signature, publicKey)',
            },
            {
              name: 'generateHMAC',
              description: 'Generate HMAC',
              signature: 'generateHMAC(data, key, algorithm?)',
            },
            {
              name: 'verifyHMAC',
              description: 'Verify HMAC',
              signature: 'verifyHMAC(data, key, hmac, algorithm?)',
            },
            {
              name: 'hashPassword',
              description: 'Hash password with bcrypt',
              signature: 'hashPassword(password, rounds?)',
            },
            {
              name: 'verifyPassword',
              description: 'Verify password against hash',
              signature: 'verifyPassword(password, hash)',
            },
            {
              name: 'generateSalt',
              description: 'Generate random salt',
              signature: 'generateSalt(bytes?)',
            },
            {
              name: 'secureCompare',
              description: 'Timing-safe string comparison',
              signature: 'secureCompare(a, b)',
            },
          ],
        },
        {
          name: 'json-transform',
          functions: [
            {
              name: 'validateJson',
              description: 'Validate JSON against schema',
              signature: 'validateJson(data, schema)',
            },
            {
              name: 'transformJson',
              description: 'Transform JSON using mapping',
              signature: 'transformJson(data, mapping)',
            },
            {
              name: 'getNestedValue',
              description: 'Get value from nested path',
              signature: 'getNestedValue(obj, path)',
              example: 'getNestedValue({ user: { name: "John" } }, "user.name") → "John"',
            },
            {
              name: 'setNestedValue',
              description: 'Set value at nested path',
              signature: 'setNestedValue(obj, path, value)',
            },
            {
              name: 'deleteNestedValue',
              description: 'Delete value at nested path',
              signature: 'deleteNestedValue(obj, path)',
            },
            {
              name: 'flattenObject',
              description: 'Flatten nested object',
              signature: 'flattenObject(obj, separator?)',
            },
            {
              name: 'unflattenObject',
              description: 'Unflatten flat object',
              signature: 'unflattenObject(obj, separator?)',
            },
            {
              name: 'mergeDeep',
              description: 'Deep merge objects',
              signature: 'mergeDeep(target, ...sources)',
            },
            {
              name: 'cloneDeep',
              description: 'Deep clone object',
              signature: 'cloneDeep(obj)',
            },
            {
              name: 'omit',
              description: 'Create object without specified keys',
              signature: 'omit(obj, keys)',
            },
            {
              name: 'pick',
              description: 'Create object with only specified keys',
              signature: 'pick(obj, keys)',
            },
            {
              name: 'mapKeys',
              description: 'Transform object keys',
              signature: 'mapKeys(obj, fn)',
            },
            {
              name: 'mapValues',
              description: 'Transform object values',
              signature: 'mapValues(obj, fn)',
            },
            {
              name: 'filterObject',
              description: 'Filter object by predicate',
              signature: 'filterObject(obj, predicate)',
            },
            {
              name: 'compactObject',
              description: 'Remove null/undefined values',
              signature: 'compactObject(obj)',
            },
          ],
        },
        {
          name: 'transform',
          functions: [
            {
              name: 'renameFields',
              description: 'Rename multiple fields at once in array of objects',
              signature: 'renameFields(items, fieldMap)',
              example: 'renameFields([{oldName: "John"}], {oldName: "newName"}) → [{newName: "John"}]',
            },
            {
              name: 'selectFields',
              description: 'Select only specified fields from objects',
              signature: 'selectFields(items, fields)',
              example: 'selectFields([{id: 1, name: "John", age: 30}], ["id", "name"]) → [{id: 1, name: "John"}]',
            },
            {
              name: 'castTypes',
              description: 'Cast field types (string→number, etc.)',
              signature: 'castTypes(items, typeMap)',
              example: 'castTypes([{age: "30"}], {age: "number"}) → [{age: 30}]',
            },
            {
              name: 'mergeFields',
              description: 'Combine multiple fields into one',
              signature: 'mergeFields(items, sourceFields, destField, separator?)',
              example: 'mergeFields([{first: "John", last: "Doe"}], ["first", "last"], "fullName", " ") → [{fullName: "John Doe"}]',
            },
            {
              name: 'splitField',
              description: 'Split a field into multiple fields',
              signature: 'splitField(items, field, delimiter, newFields)',
              example: 'splitField([{fullName: "John Doe"}], "fullName", " ", ["first", "last"]) → [{first: "John", last: "Doe"}]',
            },
            {
              name: 'defaultValues',
              description: 'Fill in default values for missing fields',
              signature: 'defaultValues(items, defaults)',
              example: 'defaultValues([{name: "John"}], {name: "Unknown", age: 0}) → [{name: "John", age: 0}]',
            },
            {
              name: 'removeNulls',
              description: 'Remove null and undefined values from objects',
              signature: 'removeNulls(items)',
              example: 'removeNulls([{a: 1, b: null, c: undefined, d: 0}]) → [{a: 1, d: 0}]',
            },
            {
              name: 'removeEmptyStrings',
              description: 'Remove empty strings from objects',
              signature: 'removeEmptyStrings(items)',
              example: 'removeEmptyStrings([{a: "hello", b: "", c: "world"}]) → [{a: "hello", c: "world"}]',
            },
            {
              name: 'trimStrings',
              description: 'Trim whitespace from all string fields',
              signature: 'trimStrings(items)',
              example: 'trimStrings([{name: "  John  ", age: 30}]) → [{name: "John", age: 30}]',
            },
            {
              name: 'flattenObjects',
              description: 'Flatten nested objects to dot notation',
              signature: 'flattenObjects(items, maxDepth?)',
              example: 'flattenObjects([{user: {name: "John", age: 30}}]) → [{"user.name": "John", "user.age": 30}]',
            },
            {
              name: 'unflattenObjects',
              description: 'Unflatten dot notation to nested objects',
              signature: 'unflattenObjects(items)',
              example: 'unflattenObjects([{"user.name": "John", "user.age": 30}]) → [{user: {name: "John", age: 30}}]',
            },
            {
              name: 'mapFieldValues',
              description: 'Map values based on a mapping object',
              signature: 'mapFieldValues(items, field, valueMap)',
              example: 'mapFieldValues([{status: "active"}], "status", {active: "enabled", inactive: "disabled"}) → [{status: "enabled"}]',
            },
          ],
        },
        {
          name: 'webhook',
          functions: [
            {
              name: 'sendWebhook',
              description: 'Send webhook POST request',
              signature: 'sendWebhook(url, payload, options?)',
            },
            {
              name: 'sendSlackWebhook',
              description: 'Send Slack webhook',
              signature: 'sendSlackWebhook(url, message)',
            },
            {
              name: 'sendDiscordWebhook',
              description: 'Send Discord webhook',
              signature: 'sendDiscordWebhook(url, content, embeds?)',
            },
            {
              name: 'sendTeamsWebhook',
              description: 'Send Microsoft Teams webhook',
              signature: 'sendTeamsWebhook(url, message)',
            },
            {
              name: 'verifyWebhookSignature',
              description: 'Verify webhook signature',
              signature: 'verifyWebhookSignature(payload, signature, secret, algorithm?)',
            },
            {
              name: 'createWebhookSignature',
              description: 'Create webhook signature',
              signature: 'createWebhookSignature(payload, secret, algorithm?)',
            },
            {
              name: 'retryWebhook',
              description: 'Send webhook with retry logic',
              signature: 'retryWebhook(url, payload, options?)',
            },
            {
              name: 'batchWebhooks',
              description: 'Send multiple webhooks',
              signature: 'batchWebhooks(webhooks)',
            },
            {
              name: 'sendSlackBlocks',
              description: 'Send Slack blocks to webhook',
              signature: 'sendSlackBlocks(url, blocks, text?)',
            },
            {
              name: 'sendDiscordEmbed',
              description: 'Send Discord embed to webhook',
              signature: 'sendDiscordEmbed(url, embed)',
            },
            {
              name: 'sendWebhookWithAuth',
              description: 'Send authenticated webhook',
              signature: 'sendWebhookWithAuth(url, payload, authHeader)',
            },
            {
              name: 'parseWebhookPayload',
              description: 'Parse incoming webhook payload',
              signature: 'parseWebhookPayload(body, contentType?)',
            },
          ],
        },
        {
          name: 'image',
          functions: [
            {
              name: 'resizeImage',
              description: 'Resize image to dimensions',
              signature: 'resizeImage(buffer, width, height, options?)',
            },
            {
              name: 'cropImage',
              description: 'Crop image to dimensions',
              signature: 'cropImage(buffer, x, y, width, height)',
            },
            {
              name: 'convertFormat',
              description: 'Convert image format',
              signature: 'convertFormat(buffer, format, options?)',
            },
            {
              name: 'compressImage',
              description: 'Compress image',
              signature: 'compressImage(buffer, quality?)',
            },
            {
              name: 'rotateImage',
              description: 'Rotate image',
              signature: 'rotateImage(buffer, degrees)',
            },
            {
              name: 'flipImage',
              description: 'Flip image horizontally/vertically',
              signature: 'flipImage(buffer, direction)',
            },
            {
              name: 'grayscaleImage',
              description: 'Convert to grayscale',
              signature: 'grayscaleImage(buffer)',
            },
            {
              name: 'addWatermark',
              description: 'Add text watermark',
              signature: 'addWatermark(buffer, text, options?)',
            },
            {
              name: 'getImageMetadata',
              description: 'Get image metadata',
              signature: 'getImageMetadata(buffer)',
            },
            {
              name: 'createThumbnail',
              description: 'Create thumbnail',
              signature: 'createThumbnail(buffer, size?)',
            },
            {
              name: 'blurImage',
              description: 'Apply blur effect',
              signature: 'blurImage(buffer, sigma?)',
            },
            {
              name: 'downloadImage',
              description: 'Download image from URL',
              signature: 'downloadImage(url)',
            },
          ],
        },
        {
          name: 'pdf',
          functions: [
            {
              name: 'createPdf',
              description: 'Create PDF from HTML',
              signature: 'createPdf(html, options?)',
            },
            {
              name: 'extractText',
              description: 'Extract text from PDF',
              signature: 'extractText(buffer)',
            },
            {
              name: 'extractMetadata',
              description: 'Extract PDF metadata',
              signature: 'extractMetadata(buffer)',
            },
            {
              name: 'mergePdfs',
              description: 'Merge multiple PDFs',
              signature: 'mergePdfs(buffers)',
            },
            {
              name: 'splitPdf',
              description: 'Split PDF into pages',
              signature: 'splitPdf(buffer)',
            },
            {
              name: 'compressPdf',
              description: 'Compress PDF',
              signature: 'compressPdf(buffer, options?)',
            },
            {
              name: 'addWatermark',
              description: 'Add watermark to PDF',
              signature: 'addWatermark(buffer, watermarkText, options?)',
            },
            {
              name: 'protectPdf',
              description: 'Add password protection',
              signature: 'protectPdf(buffer, password, permissions?)',
            },
            {
              name: 'convertToPdfA',
              description: 'Convert to PDF/A format',
              signature: 'convertToPdfA(buffer)',
            },
            {
              name: 'generateInvoicePdf',
              description: 'Generate invoice PDF',
              signature: 'generateInvoicePdf(invoiceData)',
            },
          ],
        },
        {
          name: 'xml',
          functions: [
            {
              name: 'parseXml',
              description: 'Parse XML to object',
              signature: 'parseXml(xml, options?)',
            },
            {
              name: 'buildXml',
              description: 'Build XML from object',
              signature: 'buildXml(obj, options?)',
            },
            {
              name: 'validateXml',
              description: 'Validate XML against schema',
              signature: 'validateXml(xml, schema)',
            },
            {
              name: 'transformXml',
              description: 'Transform XML using XSLT',
              signature: 'transformXml(xml, xslt)',
            },
            {
              name: 'queryXml',
              description: 'Query XML using XPath',
              signature: 'queryXml(xml, xpath)',
            },
            {
              name: 'prettyPrintXml',
              description: 'Format XML with indentation',
              signature: 'prettyPrintXml(xml)',
            },
            {
              name: 'minifyXml',
              description: 'Remove whitespace from XML',
              signature: 'minifyXml(xml)',
            },
            {
              name: 'xmlToJson',
              description: 'Convert XML to JSON',
              signature: 'xmlToJson(xml)',
            },
            {
              name: 'jsonToXml',
              description: 'Convert JSON to XML',
              signature: 'jsonToXml(json, rootName?)',
            },
            {
              name: 'extractXmlValue',
              description: 'Extract value by tag',
              signature: 'extractXmlValue(xml, tagName)',
            },
            {
              name: 'updateXmlValue',
              description: 'Update XML tag value',
              signature: 'updateXmlValue(xml, tagName, newValue)',
            },
          ],
        },
        {
          name: 'deduplication',
          functions: [
            {
              name: 'filterProcessed',
              description: 'Filter out IDs that already exist in database',
              signature: 'filterProcessed({ tableName, idColumn, idsToCheck })',
              example: 'await filterProcessed({ tableName: "tweet_replies", idColumn: "original_tweet_id", idsToCheck: ["123", "456"] })',
            },
            {
              name: 'hasProcessed',
              description: 'Check if single ID exists in database',
              signature: 'hasProcessed({ tableName, idColumn, idToCheck })',
            },
            {
              name: 'filterProcessedItems',
              description: 'Filter array of objects to remove already-processed items',
              signature: 'filterProcessedItems({ items, tableName, idColumn, itemIdField })',
              example: 'await filterProcessedItems({ items: tweets, tableName: "tweet_replies", idColumn: "original_tweet_id", itemIdField: "tweet_id" })',
            },
            {
              name: 'markAsProcessed',
              description: 'Mark item as processed by inserting record',
              signature: 'markAsProcessed({ tableName, record })',
            },
            {
              name: 'deduplicateBy',
              description: 'Remove duplicates from array based on field value (in-memory)',
              signature: 'deduplicateBy({ items, field })',
              example: 'await deduplicateBy({ items: tweets, field: "id" })',
            },
            {
              name: 'deduplicateByMultiple',
              description: 'Remove duplicates using composite key from multiple fields (in-memory)',
              signature: 'deduplicateByMultiple({ items, fields })',
              example: 'await deduplicateByMultiple({ items: posts, fields: ["userId", "postId"] })',
            },
            {
              name: 'findDuplicates',
              description: 'Find duplicate items instead of removing them (in-memory)',
              signature: 'findDuplicates({ items, field })',
              example: 'await findDuplicates({ items: tweets, field: "content" })',
            },
            {
              name: 'excludeByIds',
              description: 'Exclude items by ID list (in-memory)',
              signature: 'excludeByIds({ items, excludeIds, idField })',
              example: 'await excludeByIds({ items: tweets, excludeIds: ["123", "456"], idField: "id" })',
            },
            {
              name: 'uniqueValues',
              description: 'Get array of unique values for a specific field (in-memory)',
              signature: 'uniqueValues({ items, field })',
              example: 'await uniqueValues({ items: tweets, field: "userId" }) → ["user1", "user2", ...]',
            },
          ],
        },
        {
          name: 'scoring',
          functions: [
            {
              name: 'rankByWeightedScore',
              description: 'Rank array by weighted score calculation (e.g., engagement)',
              signature: 'rankByWeightedScore({ items, scoreFields, tieBreaker?, similarityThreshold? })',
              example: 'await rankByWeightedScore({ items: tweets, scoreFields: [{ field: "likes", weight: 1 }, { field: "retweets", weight: 2 }], tieBreaker: { field: "created_at", order: "desc" } })',
            },
            {
              name: 'calculateScore',
              description: 'Calculate weighted score for single item',
              signature: 'calculateScore({ item, scoreFields })',
            },
            {
              name: 'selectTop',
              description: 'Select top N items from array',
              signature: 'selectTop({ items, count? })',
              example: 'await selectTop({ items: rankedTweets, count: 1 })',
            },
            {
              name: 'selectBottom',
              description: 'Select bottom N items from array',
              signature: 'selectBottom({ items, count? })',
            },
            {
              name: 'selectRandom',
              description: 'Select random item(s) from array',
              signature: 'selectRandom({ items, count? })',
            },
            {
              name: 'rankByField',
              description: 'Rank items by single field',
              signature: 'rankByField({ items, field, order? })',
              example: 'await rankByField({ items: tweets, field: "likes", order: "desc" })',
            },
            {
              name: 'filterByMinScore',
              description: 'Filter items above minimum score threshold',
              signature: 'filterByMinScore({ items, scoreFields, minScore })',
            },
          ],
        },
        {
          name: 'validation',
          functions: [
            {
              name: 'validateRequired',
              description: 'Check if required fields exist in data',
              signature: 'validateRequired(data, fields)',
              example: 'await validateRequired({ name: "John", email: "john@example.com" }, ["name", "email"]) → { valid: true, errors: [] }',
            },
            {
              name: 'validateTypes',
              description: 'Check if field types match expected types',
              signature: 'validateTypes(data, typeMap)',
              example: 'await validateTypes({ name: "John", age: 30 }, { name: "string", age: "number" }) → { valid: true, errors: [] }',
            },
            {
              name: 'validateLength',
              description: 'Validate string or array length',
              signature: 'validateLength(value, min?, max?)',
              example: 'await validateLength("hello", 1, 10) → { valid: true, errors: [] }',
            },
            {
              name: 'validateRange',
              description: 'Validate number is within range',
              signature: 'validateRange(value, min?, max?)',
              example: 'await validateRange(5, 1, 10) → { valid: true, errors: [] }',
            },
            {
              name: 'validatePattern',
              description: 'Validate value against regex pattern',
              signature: 'validatePattern(value, pattern)',
              example: 'await validatePattern("abc123", /^[a-z0-9]+$/) → { valid: true, errors: [] }',
            },
            {
              name: 'validateEmail',
              description: 'Validate email address format',
              signature: 'validateEmail(email)',
              example: 'await validateEmail("user@example.com") → { valid: true, errors: [] }',
            },
            {
              name: 'validateUrl',
              description: 'Validate URL format',
              signature: 'validateUrl(url)',
              example: 'await validateUrl("https://example.com") → { valid: true, errors: [] }',
            },
            {
              name: 'isValid',
              description: 'Validate data against multiple rules (combined validation)',
              signature: 'isValid(data, rules)',
              example: 'await isValid({ name: "John", email: "john@example.com", age: 30 }, { name: { type: "string", required: true, minLength: 2 }, email: { type: "string", email: true }, age: { type: "number", min: 18, max: 120 } }) → { valid: true, errors: [] }',
            },
          ],
        },
        {
          name: 'filtering',
          functions: [
            {
              name: 'filterArrayByCondition',
              description: 'Filter array by condition (>, <, =, !=, contains, startsWith, endsWith)',
              signature: 'filterArrayByCondition(items, field, operator, value)',
              example: 'await filterArrayByCondition([{age: 25}, {age: 30}], "age", ">", 26) → [{age: 30}]',
            },
            {
              name: 'findItemByCondition',
              description: 'Find first item matching condition',
              signature: 'findItemByCondition(items, field, operator, value)',
              example: 'await findItemByCondition([{id: 1}, {id: 2}], "id", "=", 2) → {id: 2}',
            },
            {
              name: 'containsAll',
              description: 'Check if array contains all specified values',
              signature: 'containsAll(array, searchValues)',
              example: 'await containsAll([1, 2, 3, 4], [2, 3]) → true',
            },
            {
              name: 'containsAny',
              description: 'Check if array contains any of the specified values',
              signature: 'containsAny(array, searchValues)',
              example: 'await containsAny([1, 2, 3], [3, 4]) → true',
            },
            {
              name: 'textMatches',
              description: 'Pattern matching helper for text (supports regex)',
              signature: 'textMatches(text, pattern, caseSensitive?)',
              example: 'await textMatches("Hello World", "hello", false) → true',
            },
            {
              name: 'filterByMultiple',
              description: 'Filter array by multiple conditions with AND/OR logic',
              signature: 'filterByMultiple(items, { conditions, logic? })',
              example: 'await filterByMultiple([{age: 25, name: "John"}], { conditions: [{ field: "age", operator: ">", value: 20 }, { field: "name", operator: "startsWith", value: "J" }], logic: "AND" }) → [{age: 25, name: "John"}]',
            },
          ],
        },
        {
          name: 'control-flow',
          functions: [
            {
              name: 'coalesce',
              description: 'Return first non-null/undefined value',
              signature: 'coalesce(...values)',
              example: 'coalesce(null, undefined, "hello", "world") → "hello"',
            },
            {
              name: 'defaultValue',
              description: 'Return value or default if null/undefined',
              signature: 'defaultValue(value, defaultVal)',
              example: 'defaultValue(null, "default") → "default"',
            },
            {
              name: 'conditional',
              description: 'Ternary conditional helper',
              signature: 'conditional(condition, trueVal, falseVal)',
              example: 'conditional(score > 10, "high", "low") → "high" if score > 10',
            },
            {
              name: 'switchCase',
              description: 'Switch/case pattern matching',
              signature: 'switchCase(value, cases, defaultCase)',
              example: 'switchCase("red", { red: "#f00", blue: "#00f" }, "#000") → "#f00"',
            },
            {
              name: 'retry',
              description: 'Retry function with exponential backoff',
              signature: 'retry(fn, maxAttempts?, delayMs?)',
              example: 'await retry(async () => fetchData(), 3, 1000)',
            },
            {
              name: 'timeout',
              description: 'Execute function with timeout',
              signature: 'timeout(fn, timeoutMs?)',
              example: 'await timeout(async () => slowOperation(), 5000)',
            },
            {
              name: 'sleep',
              description: 'Delay/wait for milliseconds',
              signature: 'sleep(ms)',
              example: 'await sleep(1000) // Wait 1 second',
            },
            {
              name: 'isTruthy',
              description: 'Check if value is truthy',
              signature: 'isTruthy(value)',
              example: 'isTruthy("hello") → true',
            },
            {
              name: 'isFalsy',
              description: 'Check if value is falsy',
              signature: 'isFalsy(value)',
              example: 'isFalsy(null) → true',
            },
            {
              name: 'isNullOrUndefined',
              description: 'Check if value is null or undefined',
              signature: 'isNullOrUndefined(value)',
              example: 'isNullOrUndefined(null) → true',
            },
            {
              name: 'isDefined',
              description: 'Check if value is defined (not null/undefined)',
              signature: 'isDefined(value)',
              example: 'isDefined("hello") → true',
            },
          ],
        },
        {
          name: 'aggregation',
          functions: [
            {
              name: 'groupAndAggregate',
              description: 'Group array by field and apply aggregations (sum, avg, count, min, max)',
              signature: 'groupAndAggregate(items, groupField, aggregations)',
              example: 'groupAndAggregate([{cat:"A",amt:100},{cat:"A",amt:200}], "cat", [{field:"amt",operation:"sum",outputAs:"total"}]) → [{groupValue:"A",total:300}]',
            },
            {
              name: 'percentile',
              description: 'Calculate percentile of numeric array',
              signature: 'percentile(numbers, percent)',
              example: 'percentile([1,2,3,4,5,6,7,8,9,10], 90) → 9',
            },
            {
              name: 'median',
              description: 'Calculate median of numeric array',
              signature: 'median(numbers)',
              example: 'median([1,2,3,4,5]) → 3',
            },
            {
              name: 'variance',
              description: 'Calculate variance of numeric array',
              signature: 'variance(numbers)',
              example: 'variance([1,2,3,4,5]) → 2',
            },
            {
              name: 'stdDeviation',
              description: 'Calculate standard deviation of numeric array',
              signature: 'stdDeviation(numbers)',
              example: 'stdDeviation([1,2,3,4,5]) → 1.414',
            },
            {
              name: 'mode',
              description: 'Find most frequent value(s) in array',
              signature: 'mode(items)',
              example: 'mode([1,2,2,3,3,3]) → 3',
            },
            {
              name: 'summarize',
              description: 'Generate comprehensive summary statistics for a numeric field',
              signature: 'summarize(items, field)',
              example: 'summarize([{price:100},{price:200},{price:150}], "price") → {count:3,sum:450,average:150,min:100,max:200,median:150,variance:1666.67,stdDeviation:40.82}',
            },
          ],
        },
      ],
    },
    {
      name: 'Payments',
      modules: [
        {
          name: 'stripe',
          functions: [
            {
              name: 'createCustomer',
              description: 'Create Stripe customer',
              signature: 'createCustomer({ email, name?, metadata? })',
            },
            {
              name: 'createPaymentIntent',
              description: 'Create payment intent',
              signature: 'createPaymentIntent({ amount, currency, customerId?, metadata? })',
            },
            {
              name: 'createSubscription',
              description: 'Create subscription',
              signature: 'createSubscription({ customerId, priceId, metadata? })',
            },
            {
              name: 'cancelSubscription',
              description: 'Cancel subscription',
              signature: 'cancelSubscription(subscriptionId)',
            },
            {
              name: 'getCustomer',
              description: 'Get customer by ID',
              signature: 'getCustomer(customerId)',
            },
            {
              name: 'getPaymentIntent',
              description: 'Get payment intent',
              signature: 'getPaymentIntent(paymentIntentId)',
            },
            {
              name: 'getSubscription',
              description: 'Get subscription',
              signature: 'getSubscription(subscriptionId)',
            },
            {
              name: 'listCustomers',
              description: 'List customers',
              signature: 'listCustomers({ limit?, startingAfter? })',
            },
            {
              name: 'listPayments',
              description: 'List payments',
              signature: 'listPayments({ limit?, customerId? })',
            },
            {
              name: 'createRefund',
              description: 'Create refund',
              signature: 'createRefund({ paymentIntentId, amount?, reason? })',
            },
            {
              name: 'updateCustomer',
              description: 'Update customer',
              signature: 'updateCustomer(customerId, { email?, name?, metadata? })',
            },
          ],
        },
      ],
    },
    {
      name: 'Productivity',
      modules: [
        {
          name: 'calendar',
          functions: [
            {
              name: 'listEvents',
              description: 'List calendar events',
              signature: 'listEvents({ calendarId?, timeMin?, timeMax?, maxResults? })',
            },
            {
              name: 'createEvent',
              description: 'Create calendar event',
              signature: 'createEvent({ summary, description?, start, end, attendees?, calendarId? })',
            },
            {
              name: 'updateEvent',
              description: 'Update calendar event',
              signature: 'updateEvent({ eventId, summary?, description?, start?, end?, calendarId? })',
            },
            {
              name: 'deleteEvent',
              description: 'Delete calendar event',
              signature: 'deleteEvent(eventId, calendarId?)',
            },
            {
              name: 'getEvent',
              description: 'Get event by ID',
              signature: 'getEvent(eventId, calendarId?)',
            },
            {
              name: 'listCalendars',
              description: 'List all calendars',
              signature: 'listCalendars()',
            },
            {
              name: 'getFreeBusy',
              description: 'Get free/busy information',
              signature: 'getFreeBusy({ timeMin, timeMax, calendarIds })',
            },
            {
              name: 'quickAddEvent',
              description: 'Quick add event from text',
              signature: 'quickAddEvent(text, calendarId?)',
            },
            {
              name: 'findAvailableSlots',
              description: 'Find available time slots',
              signature: 'findAvailableSlots({ timeMin, timeMax, duration, calendarId? })',
            },
            {
              name: 'createRecurringEvent',
              description: 'Create recurring event',
              signature: 'createRecurringEvent({ summary, start, end, recurrence, calendarId? })',
            },
            {
              name: 'addAttendee',
              description: 'Add attendee to event',
              signature: 'addAttendee({ eventId, email, calendarId? })',
            },
          ],
        },
      ],
    },
    {
      name: 'Data Processing',
      modules: [
        {
          name: 'snowflake',
          functions: [
            {
              name: 'executeQuery',
              description: 'Execute SQL query in Snowflake',
              signature: 'executeQuery(query, binds?, config?)',
              example: 'executeQuery("SELECT * FROM users LIMIT 10")',
            },
            {
              name: 'loadData',
              description: 'Load data from Snowflake stage',
              signature: 'loadData(tableName, stagePath, fileFormat, config?)',
            },
            {
              name: 'createTable',
              description: 'Create table in Snowflake',
              signature: 'createTable(tableName, definition, config?)',
            },
            {
              name: 'getQueryResults',
              description: 'Get query results by query ID',
              signature: 'getQueryResults(queryId, config?)',
            },
            {
              name: 'listTables',
              description: 'List tables in database/schema',
              signature: 'listTables(database?, schema?, config?)',
            },
            {
              name: 'dropTable',
              description: 'Drop table from Snowflake',
              signature: 'dropTable(tableName, ifExists?, config?)',
            },
          ],
        },
        {
          name: 'bigquery',
          functions: [
            {
              name: 'runQuery',
              description: 'Run SQL query in BigQuery',
              signature: 'runQuery(query, options?, config?)',
              example: 'runQuery("SELECT * FROM `project.dataset.table` LIMIT 10")',
            },
            {
              name: 'loadData',
              description: 'Load data from Cloud Storage',
              signature: 'loadData(datasetId, tableId, sourceUri, options?, config?)',
            },
            {
              name: 'createDataset',
              description: 'Create BigQuery dataset',
              signature: 'createDataset(datasetId, options?, config?)',
            },
            {
              name: 'getJobResults',
              description: 'Get job results by job ID',
              signature: 'getJobResults(jobId, config?)',
            },
            {
              name: 'listDatasets',
              description: 'List all datasets',
              signature: 'listDatasets(config?)',
            },
            {
              name: 'listTables',
              description: 'List tables in dataset',
              signature: 'listTables(datasetId, config?)',
            },
            {
              name: 'insertRows',
              description: 'Insert rows into table',
              signature: 'insertRows(datasetId, tableId, rows, config?)',
            },
          ],
        },
        {
          name: 'redshift',
          functions: [
            {
              name: 'executeQuery',
              description: 'Execute SQL query in Redshift',
              signature: 'executeQuery(query, binds?, config?)',
              example: 'executeQuery("SELECT * FROM sales LIMIT 10")',
            },
            {
              name: 'loadData',
              description: 'Load data from S3 into Redshift',
              signature: 'loadData(tableName, s3Path, options?, config?)',
            },
            {
              name: 'createTable',
              description: 'Create table in Redshift',
              signature: 'createTable(tableName, definition, config?)',
            },
            {
              name: 'getQueryResults',
              description: 'Get query results by query ID',
              signature: 'getQueryResults(queryId, config?)',
            },
            {
              name: 'listTables',
              description: 'List tables in database/schema',
              signature: 'listTables(database?, schema?, config?)',
            },
            {
              name: 'vacuumTable',
              description: 'Vacuum table to reclaim space',
              signature: 'vacuumTable(tableName, full?, config?)',
            },
          ],
        },
        {
          name: 'kafka',
          functions: [
            {
              name: 'produceMessage',
              description: 'Produce message to Kafka topic',
              signature: 'produceMessage(topic, messages, config?)',
              example: 'produceMessage("events", { key: "user1", value: JSON.stringify({action: "login"}) })',
            },
            {
              name: 'createTopic',
              description: 'Create Kafka topic',
              signature: 'createTopic(topicName, topicConfig?, config?)',
            },
            {
              name: 'getTopicInfo',
              description: 'Get topic metadata',
              signature: 'getTopicInfo(topicName, config?)',
            },
            {
              name: 'listTopics',
              description: 'List all Kafka topics',
              signature: 'listTopics(config?)',
            },
            {
              name: 'deleteTopic',
              description: 'Delete Kafka topic',
              signature: 'deleteTopic(topicName, config?)',
            },
            {
              name: 'listConsumerGroups',
              description: 'List consumer groups',
              signature: 'listConsumerGroups(config?)',
            },
          ],
        },
        {
          name: 'rabbitmq',
          functions: [
            {
              name: 'publishMessage',
              description: 'Publish message to RabbitMQ exchange',
              signature: 'publishMessage(exchange, routingKey, message, options?, config?)',
              example: 'publishMessage("events", "user.login", JSON.stringify({userId: "123"}))',
            },
            {
              name: 'createQueue',
              description: 'Create RabbitMQ queue',
              signature: 'createQueue(queueName, options?, config?)',
            },
            {
              name: 'getQueueInfo',
              description: 'Get queue information',
              signature: 'getQueueInfo(queueName, config?)',
            },
            {
              name: 'createExchange',
              description: 'Create RabbitMQ exchange',
              signature: 'createExchange(exchangeName, type, options?, config?)',
            },
            {
              name: 'bindQueue',
              description: 'Bind queue to exchange',
              signature: 'bindQueue(queueName, exchangeName, routingKey?, config?)',
            },
            {
              name: 'deleteQueue',
              description: 'Delete RabbitMQ queue',
              signature: 'deleteQueue(queueName, config?)',
            },
            {
              name: 'purgeQueue',
              description: 'Purge all messages from queue',
              signature: 'purgeQueue(queueName, config?)',
            },
          ],
        },
        {
          name: 'huggingface',
          functions: [
            {
              name: 'runInference',
              description: 'Run inference on HuggingFace model',
              signature: 'runInference(modelId, inputs, options?, config?)',
              example: 'runInference("gpt2", "Hello, my name is")',
            },
            {
              name: 'listModels',
              description: 'List HuggingFace models',
              signature: 'listModels(filter?, config?)',
            },
            {
              name: 'getModelInfo',
              description: 'Get model information',
              signature: 'getModelInfo(modelId, config?)',
            },
            {
              name: 'generateText',
              description: 'Generate text from prompt',
              signature: 'generateText(modelId, prompt, options?, config?)',
            },
            {
              name: 'classifyText',
              description: 'Classify text with model',
              signature: 'classifyText(modelId, text, config?)',
            },
            {
              name: 'answerQuestion',
              description: 'Answer question from context',
              signature: 'answerQuestion(modelId, question, context, config?)',
            },
            {
              name: 'classifyImage',
              description: 'Classify image with model',
              signature: 'classifyImage(modelId, imageUrl, config?)',
            },
          ],
        },
        {
          name: 'replicate',
          functions: [
            {
              name: 'runPrediction',
              description: 'Run prediction on Replicate model',
              signature: 'runPrediction(modelVersion, input, config?)',
              example: 'runPrediction("stability-ai/sdxl:latest", {prompt: "a cat"})',
            },
            {
              name: 'getPrediction',
              description: 'Get prediction status and results',
              signature: 'getPrediction(predictionId, config?)',
            },
            {
              name: 'cancelPrediction',
              description: 'Cancel running prediction',
              signature: 'cancelPrediction(predictionId, config?)',
            },
            {
              name: 'listModels',
              description: 'List available Replicate models',
              signature: 'listModels(config?)',
            },
            {
              name: 'getModelInfo',
              description: 'Get model information',
              signature: 'getModelInfo(owner, name, config?)',
            },
            {
              name: 'waitForPrediction',
              description: 'Wait for prediction to complete',
              signature: 'waitForPrediction(predictionId, pollInterval?, config?)',
            },
          ],
        },
      ],
    },
    {
      name: 'Video Automation',
      modules: [
        { name: 'runway', functions: [
            { name: 'generateVideo', description: 'Generate video from text', signature: 'generateVideo({ prompt })' },
            { name: 'getGenerationStatus', description: 'Get generation status', signature: 'getGenerationStatus(id)' },
            { name: 'extendVideo', description: 'Extend video', signature: 'extendVideo({ videoUrl, prompt })' },
            { name: 'imageToVideo', description: 'Image to video', signature: 'imageToVideo({ imageUrl })' },
            { name: 'upscaleVideo', description: 'Upscale video', signature: 'upscaleVideo({ videoUrl })' },
            { name: 'interpolateFrames', description: 'Interpolate frames', signature: 'interpolateFrames({ startImageUrl, endImageUrl })' },
            { name: 'removeBackground', description: 'Remove background', signature: 'removeBackground(videoUrl)' },
            { name: 'cancelGeneration', description: 'Cancel generation', signature: 'cancelGeneration(id)' },
          ]},
        { name: 'heygen', functions: [
            { name: 'createAvatarVideo', description: 'Create avatar video', signature: 'createAvatarVideo({ text })' },
            { name: 'getVideoStatus', description: 'Get video status', signature: 'getVideoStatus(id)' },
            { name: 'listAvatars', description: 'List avatars', signature: 'listAvatars()' },
            { name: 'listVoices', description: 'List voices', signature: 'listVoices()' },
            { name: 'deleteVideo', description: 'Delete video', signature: 'deleteVideo(id)' },
            { name: 'listVideos', description: 'List videos', signature: 'listVideos()' },
          ]},
        { name: 'synthesia', functions: [
            { name: 'createVideo', description: 'Create video', signature: 'createVideo({ script })' },
            { name: 'getVideoStatus', description: 'Get status', signature: 'getVideoStatus(id)' },
            { name: 'listAvatars', description: 'List avatars', signature: 'listAvatars()' },
            { name: 'listVoices', description: 'List voices', signature: 'listVoices()' },
            { name: 'deleteVideo', description: 'Delete video', signature: 'deleteVideo(id)' },
            { name: 'listVideos', description: 'List videos', signature: 'listVideos()' },
            { name: 'getQuota', description: 'Get quota', signature: 'getQuota()' },
          ]},
        { name: 'whisper', functions: [
            { name: 'transcribeAudio', description: 'Transcribe audio', signature: 'transcribeAudio({ audioFile })' },
            { name: 'transcribeAudioFromURL', description: 'Transcribe from URL', signature: 'transcribeAudioFromURL({ audioUrl })' },
            { name: 'translateAudio', description: 'Translate audio', signature: 'translateAudio({ audioFile })' },
            { name: 'detectLanguage', description: 'Detect language', signature: 'detectLanguage({ audioFile })' },
            { name: 'transcribeWithSegments', description: 'Transcribe with timestamps', signature: 'transcribeWithSegments({ audioFile })' },
            { name: 'generateSubtitles', description: 'Generate subtitles', signature: 'generateSubtitles({ audioFile })' },
          ]},
        { name: 'elevenlabs', functions: [
            { name: 'generateSpeech', description: 'Generate speech', signature: 'generateSpeech({ text, voiceId? })' },
            { name: 'listVoices', description: 'List voices', signature: 'listVoices()' },
            { name: 'getVoiceDetails', description: 'Get voice details', signature: 'getVoiceDetails(id)' },
            { name: 'cloneVoice', description: 'Clone voice', signature: 'cloneVoice({ name, files })' },
            { name: 'deleteVoice', description: 'Delete voice', signature: 'deleteVoice(id)' },
            { name: 'getSubscriptionInfo', description: 'Get subscription', signature: 'getSubscriptionInfo()' },
            { name: 'getModels', description: 'Get models', signature: 'getModels()' },
          ]},
        { name: 'cloudinary', functions: [
            { name: 'uploadVideo', description: 'Upload video', signature: 'uploadVideo({ file })' },
            { name: 'transformVideo', description: 'Transform video', signature: 'transformVideo({ publicId, transformations })' },
            { name: 'generateThumbnail', description: 'Generate thumbnail', signature: 'generateThumbnail({ publicId })' },
            { name: 'convertFormat', description: 'Convert format', signature: 'convertFormat({ publicId, format })' },
            { name: 'addTextOverlay', description: 'Add text overlay', signature: 'addTextOverlay({ publicId, text })' },
            { name: 'deleteVideo', description: 'Delete video', signature: 'deleteVideo(publicId)' },
            { name: 'getVideoDetails', description: 'Get details', signature: 'getVideoDetails(publicId)' },
            { name: 'listVideos', description: 'List videos', signature: 'listVideos()' },
          ]},
        { name: 'vimeo', functions: [
            { name: 'uploadVideo', description: 'Upload video', signature: 'uploadVideo({ file })' },
            { name: 'getVideoInfo', description: 'Get info', signature: 'getVideoInfo(id)' },
            { name: 'updateVideo', description: 'Update video', signature: 'updateVideo({ id, name? })' },
            { name: 'deleteVideo', description: 'Delete video', signature: 'deleteVideo(id)' },
            { name: 'listVideos', description: 'List videos', signature: 'listVideos()' },
            { name: 'getEmbedCode', description: 'Get embed code', signature: 'getEmbedCode(id)' },
            { name: 'getThumbnail', description: 'Get thumbnail', signature: 'getThumbnail(id)' },
            { name: 'getVideoStats', description: 'Get stats', signature: 'getVideoStats(id)' },
          ]},
        { name: 'tiktok', functions: [
            { name: 'initializeUpload', description: 'Initialize upload', signature: 'initializeUpload({ title })' },
            { name: 'uploadVideo', description: 'Upload video', signature: 'uploadVideo({ file, uploadUrl })' },
            { name: 'getVideoInfo', description: 'Get info', signature: 'getVideoInfo(id)' },
            { name: 'getUserVideos', description: 'Get user videos', signature: 'getUserVideos()' },
            { name: 'getVideoComments', description: 'Get comments', signature: 'getVideoComments(id)' },
            { name: 'getUserInfo', description: 'Get user info', signature: 'getUserInfo()' },
            { name: 'deleteVideo', description: 'Delete video', signature: 'deleteVideo(id)' },
            { name: 'getVideoAnalytics', description: 'Get analytics', signature: 'getVideoAnalytics(id)' },
          ]},
      ],
    },
    {
      name: 'Business',
      modules: [
        { name: 'hubspot', functions: [
            { name: 'createContact', description: 'Create contact', signature: 'createContact({ email, firstName?, lastName? })' },
            { name: 'updateContact', description: 'Update contact', signature: 'updateContact(id, { properties })' },
            { name: 'getContact', description: 'Get contact', signature: 'getContact(id)' },
            { name: 'searchContacts', description: 'Search contacts', signature: 'searchContacts({ filters })' },
            { name: 'createDeal', description: 'Create deal', signature: 'createDeal({ dealname, amount? })' },
            { name: 'updateDeal', description: 'Update deal', signature: 'updateDeal(id, { properties })' },
            { name: 'getDeal', description: 'Get deal', signature: 'getDeal(id)' },
            { name: 'searchDeals', description: 'Search deals', signature: 'searchDeals({ filters })' },
            { name: 'createCompany', description: 'Create company', signature: 'createCompany({ name, domain? })' },
            { name: 'updateCompany', description: 'Update company', signature: 'updateCompany(id, { properties })' },
            { name: 'getCompany', description: 'Get company', signature: 'getCompany(id)' },
            { name: 'searchCompanies', description: 'Search companies', signature: 'searchCompanies({ filters })' },
            { name: 'associateContactWithCompany', description: 'Associate contact', signature: 'associateContactWithCompany(contactId, companyId)' },
            { name: 'associateDealWithContact', description: 'Associate deal', signature: 'associateDealWithContact(dealId, contactId)' },
          ]},
        { name: 'salesforce', functions: [
            { name: 'createLead', description: 'Create lead', signature: 'createLead({ firstName, lastName, company })' },
            { name: 'updateLead', description: 'Update lead', signature: 'updateLead(id, { updates })' },
            { name: 'getLead', description: 'Get lead', signature: 'getLead(id)' },
            { name: 'convertLead', description: 'Convert lead', signature: 'convertLead(id)' },
            { name: 'createOpportunity', description: 'Create opportunity', signature: 'createOpportunity({ name, stage, closeDate })' },
            { name: 'updateOpportunity', description: 'Update opportunity', signature: 'updateOpportunity(id, { updates })' },
            { name: 'getOpportunity', description: 'Get opportunity', signature: 'getOpportunity(id)' },
            { name: 'createAccount', description: 'Create account', signature: 'createAccount({ name, type? })' },
            { name: 'updateAccount', description: 'Update account', signature: 'updateAccount(id, { updates })' },
            { name: 'getAccount', description: 'Get account', signature: 'getAccount(id)' },
            { name: 'query', description: 'SOQL query', signature: 'query(soql)' },
          ]},
        { name: 'pipedrive', functions: [
            { name: 'createDeal', description: 'Create deal', signature: 'createDeal({ title, value?, personId? })' },
            { name: 'updateDeal', description: 'Update deal', signature: 'updateDeal(id, { updates })' },
            { name: 'getDeal', description: 'Get deal', signature: 'getDeal(id)' },
            { name: 'listDeals', description: 'List deals', signature: 'listDeals()' },
            { name: 'createPerson', description: 'Create person', signature: 'createPerson({ name, email?, phone? })' },
            { name: 'updatePerson', description: 'Update person', signature: 'updatePerson(id, { updates })' },
            { name: 'getPerson', description: 'Get person', signature: 'getPerson(id)' },
            { name: 'listPersons', description: 'List persons', signature: 'listPersons()' },
            { name: 'createOrganization', description: 'Create organization', signature: 'createOrganization({ name })' },
            { name: 'updateOrganization', description: 'Update organization', signature: 'updateOrganization(id, { updates })' },
            { name: 'getOrganization', description: 'Get organization', signature: 'getOrganization(id)' },
          ]},
        { name: 'quickbooks', functions: [
            { name: 'createInvoice', description: 'Create invoice', signature: 'createInvoice({ customerRef, line })' },
            { name: 'getInvoice', description: 'Get invoice', signature: 'getInvoice(id)' },
            { name: 'sendInvoice', description: 'Send invoice', signature: 'sendInvoice(id, email)' },
            { name: 'createCustomer', description: 'Create customer', signature: 'createCustomer({ displayName, email? })' },
            { name: 'getCustomer', description: 'Get customer', signature: 'getCustomer(id)' },
            { name: 'createPayment', description: 'Create payment', signature: 'createPayment({ customerRef, totalAmt })' },
            { name: 'getPayment', description: 'Get payment', signature: 'getPayment(id)' },
            { name: 'query', description: 'QuickBooks query', signature: 'query(sql)' },
          ]},
        { name: 'freshbooks', functions: [
            { name: 'createInvoice', description: 'Create invoice', signature: 'createInvoice({ clientId, lines })' },
            { name: 'getInvoice', description: 'Get invoice', signature: 'getInvoice(id)' },
            { name: 'sendInvoice', description: 'Send invoice', signature: 'sendInvoice(id)' },
            { name: 'createClient', description: 'Create client', signature: 'createClient({ organization, email })' },
            { name: 'getClient', description: 'Get client', signature: 'getClient(id)' },
            { name: 'createExpense', description: 'Create expense', signature: 'createExpense({ amount, categoryId })' },
            { name: 'getExpense', description: 'Get expense', signature: 'getExpense(id)' },
            { name: 'listInvoices', description: 'List invoices', signature: 'listInvoices()' },
          ]},
        { name: 'xero', functions: [
            { name: 'createInvoice', description: 'Create invoice', signature: 'createInvoice({ contact, lineItems })' },
            { name: 'getInvoice', description: 'Get invoice', signature: 'getInvoice(id)' },
            { name: 'createContact', description: 'Create contact', signature: 'createContact({ name, email? })' },
            { name: 'getContact', description: 'Get contact', signature: 'getContact(id)' },
            { name: 'createPayment', description: 'Create payment', signature: 'createPayment({ invoice, account, amount })' },
            { name: 'getPayment', description: 'Get payment', signature: 'getPayment(id)' },
            { name: 'listInvoices', description: 'List invoices', signature: 'listInvoices()' },
          ]},
        { name: 'docusign', functions: [
            { name: 'createEnvelope', description: 'Create envelope', signature: 'createEnvelope({ documents, recipients })' },
            { name: 'sendEnvelope', description: 'Send envelope', signature: 'sendEnvelope(envelopeId)' },
            { name: 'getEnvelopeStatus', description: 'Get status', signature: 'getEnvelopeStatus(envelopeId)' },
            { name: 'listEnvelopes', description: 'List envelopes', signature: 'listEnvelopes()' },
            { name: 'downloadDocument', description: 'Download document', signature: 'downloadDocument(envelopeId, documentId)' },
            { name: 'voidEnvelope', description: 'Void envelope', signature: 'voidEnvelope(envelopeId, reason)' },
          ]},
        { name: 'hellosign', functions: [
            { name: 'createSignatureRequest', description: 'Create request', signature: 'createSignatureRequest({ title, signers, files })' },
            { name: 'sendSignatureRequest', description: 'Send request', signature: 'sendSignatureRequest(id)' },
            { name: 'getSignatureRequest', description: 'Get request', signature: 'getSignatureRequest(id)' },
            { name: 'listSignatureRequests', description: 'List requests', signature: 'listSignatureRequests()' },
            { name: 'downloadFiles', description: 'Download files', signature: 'downloadFiles(id)' },
            { name: 'cancelSignatureRequest', description: 'Cancel request', signature: 'cancelSignatureRequest(id)' },
          ]},
        { name: 'gohighlevel', functions: [
            { name: 'createContact', description: 'Create contact', signature: 'createContact({ email?, firstName?, lastName?, phone?, tags? })' },
            { name: 'updateContact', description: 'Update contact', signature: 'updateContact(contactId, { email?, firstName?, phone? })' },
            { name: 'getContact', description: 'Get contact by ID', signature: 'getContact(contactId)' },
            { name: 'getContactByEmail', description: 'Get contact by email', signature: 'getContactByEmail(email)' },
            { name: 'searchContacts', description: 'Search contacts', signature: 'searchContacts(query?, limit?)' },
            { name: 'deleteContact', description: 'Delete contact', signature: 'deleteContact(contactId)' },
            { name: 'addTagsToContact', description: 'Add tags to contact', signature: 'addTagsToContact(contactId, tags)' },
            { name: 'removeTagsFromContact', description: 'Remove tags from contact', signature: 'removeTagsFromContact(contactId, tags)' },
            { name: 'createOpportunity', description: 'Create opportunity', signature: 'createOpportunity({ name, pipelineId, pipelineStageId, contactId, status })' },
            { name: 'updateOpportunity', description: 'Update opportunity', signature: 'updateOpportunity(opportunityId, { name?, pipelineStageId?, status? })' },
            { name: 'getOpportunity', description: 'Get opportunity', signature: 'getOpportunity(opportunityId)' },
            { name: 'searchOpportunities', description: 'Search opportunities', signature: 'searchOpportunities(pipelineId?, contactId?, status?)' },
            { name: 'deleteOpportunity', description: 'Delete opportunity', signature: 'deleteOpportunity(opportunityId)' },
            { name: 'createAppointment', description: 'Create appointment', signature: 'createAppointment({ calendarId, contactId, title, startTime, endTime })' },
            { name: 'updateAppointment', description: 'Update appointment', signature: 'updateAppointment(appointmentId, { title?, startTime?, endTime? })' },
            { name: 'getAppointment', description: 'Get appointment', signature: 'getAppointment(appointmentId)' },
            { name: 'deleteAppointment', description: 'Delete appointment', signature: 'deleteAppointment(appointmentId)' },
            { name: 'createTask', description: 'Create task', signature: 'createTask({ title, contactId, assignedTo, dueDate? })' },
            { name: 'updateTask', description: 'Update task', signature: 'updateTask(taskId, { title?, completed? })' },
            { name: 'getTask', description: 'Get task', signature: 'getTask(taskId)' },
            { name: 'deleteTask', description: 'Delete task', signature: 'deleteTask(taskId)' },
            { name: 'completeTask', description: 'Mark task as completed', signature: 'completeTask(taskId)' },
            { name: 'createNote', description: 'Create note', signature: 'createNote(contactId, body, userId?)' },
            { name: 'getNote', description: 'Get note', signature: 'getNote(noteId)' },
            { name: 'getContactNotes', description: 'Get contact notes', signature: 'getContactNotes(contactId)' },
            { name: 'deleteNote', description: 'Delete note', signature: 'deleteNote(noteId)' },
            { name: 'sendSMS', description: 'Send SMS to contact', signature: 'sendSMS(contactId, message)' },
            { name: 'sendEmail', description: 'Send email to contact', signature: 'sendEmail(contactId, subject, body, html?)' },
            { name: 'getContactConversations', description: 'Get contact conversations', signature: 'getContactConversations(contactId)' },
            { name: 'getConversationMessages', description: 'Get conversation messages', signature: 'getConversationMessages(conversationId, limit?)' },
          ]},
      ],
    },
    {
      name: 'Lead Generation',
      modules: [
        { name: 'hunter', functions: [
            { name: 'findEmail', description: 'Find email by name and domain', signature: 'findEmail({ firstName, lastName, domain })' },
            { name: 'verifyEmail', description: 'Verify email address', signature: 'verifyEmail(email)' },
            { name: 'domainSearch', description: 'Search emails by domain', signature: 'domainSearch(domain)' },
            { name: 'getEmailCount', description: 'Get email count for domain', signature: 'getEmailCount(domain)' },
            { name: 'bulkVerify', description: 'Bulk verify emails', signature: 'bulkVerify(emails)' },
            { name: 'getAccountInfo', description: 'Get account info', signature: 'getAccountInfo()' },
            { name: 'searchLeads', description: 'Search leads', signature: 'searchLeads({ query })' },
          ]},
        { name: 'apollo', functions: [
            { name: 'searchPeople', description: 'Search people', signature: 'searchPeople({ titles?, companies? })' },
            { name: 'enrichPerson', description: 'Enrich person data', signature: 'enrichPerson({ email?, linkedinUrl? })' },
            { name: 'searchOrganizations', description: 'Search organizations', signature: 'searchOrganizations({ query })' },
            { name: 'enrichOrganization', description: 'Enrich organization', signature: 'enrichOrganization({ domain })' },
            { name: 'createContact', description: 'Create contact', signature: 'createContact({ firstName, lastName, email })' },
            { name: 'addToSequence', description: 'Add to sequence', signature: 'addToSequence({ contactId, sequenceId })' },
          ]},
        { name: 'clearbit', functions: [
            { name: 'enrichPerson', description: 'Enrich person', signature: 'enrichPerson(email)' },
            { name: 'enrichCompany', description: 'Enrich company', signature: 'enrichCompany(domain)' },
            { name: 'findCompany', description: 'Find company', signature: 'findCompany({ name?, domain? })' },
            { name: 'revealCompany', description: 'Reveal company from IP', signature: 'revealCompany(ip)' },
            { name: 'prospectorSearch', description: 'Search prospects', signature: 'prospectorSearch({ titles?, companies? })' },
          ]},
        { name: 'zoominfo', functions: [
            { name: 'searchContacts', description: 'Search contacts', signature: 'searchContacts({ query })' },
            { name: 'enrichContact', description: 'Enrich contact', signature: 'enrichContact({ email?, phone? })' },
            { name: 'searchCompanies', description: 'Search companies', signature: 'searchCompanies({ query })' },
            { name: 'enrichCompany', description: 'Enrich company', signature: 'enrichCompany(domain)' },
            { name: 'getTechnographics', description: 'Get technologies used', signature: 'getTechnographics(domain)' },
          ]},
        { name: 'lusha', functions: [
            { name: 'enrichPerson', description: 'Enrich person', signature: 'enrichPerson({ firstName, lastName, company })' },
            { name: 'enrichCompany', description: 'Enrich company', signature: 'enrichCompany(domain)' },
            { name: 'bulkEnrich', description: 'Bulk enrich contacts', signature: 'bulkEnrich(contacts)' },
            { name: 'getCredits', description: 'Get credits remaining', signature: 'getCredits()' },
          ]},
        { name: 'proxycurl', functions: [
            { name: 'getLinkedInProfile', description: 'Get LinkedIn profile', signature: 'getLinkedInProfile(linkedinUrl)' },
            { name: 'getCompanyProfile', description: 'Get company profile', signature: 'getCompanyProfile(linkedinUrl)' },
            { name: 'searchPeople', description: 'Search LinkedIn people', signature: 'searchPeople({ keywords })' },
            { name: 'searchCompanies', description: 'Search companies', signature: 'searchCompanies({ keywords })' },
            { name: 'getPersonEmails', description: 'Get person emails', signature: 'getPersonEmails(linkedinUrl)' },
          ]},
        { name: 'phantombuster', functions: [
            { name: 'launchPhantom', description: 'Launch automation', signature: 'launchPhantom({ phantomId, argument? })' },
            { name: 'getPhantomStatus', description: 'Get status', signature: 'getPhantomStatus(agentId)' },
            { name: 'getPhantomOutput', description: 'Get output', signature: 'getPhantomOutput(agentId)' },
            { name: 'listPhantoms', description: 'List phantoms', signature: 'listPhantoms()' },
            { name: 'fetchResultContainer', description: 'Fetch results', signature: 'fetchResultContainer(containerId)' },
          ]},
        { name: 'apify', functions: [
            { name: 'runActor', description: 'Run actor', signature: 'runActor({ actorId, input })' },
            { name: 'getActorRun', description: 'Get run status', signature: 'getActorRun(runId)' },
            { name: 'getDatasetItems', description: 'Get dataset items', signature: 'getDatasetItems(datasetId)' },
            { name: 'listActors', description: 'List actors', signature: 'listActors()' },
            { name: 'waitForRun', description: 'Wait for run completion', signature: 'waitForRun(runId)' },
          ]},
      ],
    },
    {
      name: 'E-Commerce',
      modules: [
        { name: 'shopify', functions: [
            { name: 'createProduct', description: 'Create product', signature: 'createProduct({ title, bodyHtml?, vendor? })' },
            { name: 'updateProduct', description: 'Update product', signature: 'updateProduct(id, { updates })' },
            { name: 'getProduct', description: 'Get product', signature: 'getProduct(id)' },
            { name: 'listProducts', description: 'List products', signature: 'listProducts()' },
            { name: 'deleteProduct', description: 'Delete product', signature: 'deleteProduct(id)' },
            { name: 'getOrder', description: 'Get order', signature: 'getOrder(id)' },
            { name: 'listOrders', description: 'List orders', signature: 'listOrders()' },
            { name: 'createCustomer', description: 'Create customer', signature: 'createCustomer({ email, firstName?, lastName? })' },
            { name: 'updateInventory', description: 'Update inventory', signature: 'updateInventory({ inventoryItemId, available })' },
            { name: 'getAnalytics', description: 'Get analytics', signature: 'getAnalytics()' },
          ]},
        { name: 'woocommerce', functions: [
            { name: 'createProduct', description: 'Create product', signature: 'createProduct({ name, type?, regularPrice? })' },
            { name: 'updateProduct', description: 'Update product', signature: 'updateProduct(id, { updates })' },
            { name: 'getProduct', description: 'Get product', signature: 'getProduct(id)' },
            { name: 'listProducts', description: 'List products', signature: 'listProducts()' },
            { name: 'deleteProduct', description: 'Delete product', signature: 'deleteProduct(id)' },
            { name: 'getOrder', description: 'Get order', signature: 'getOrder(id)' },
            { name: 'listOrders', description: 'List orders', signature: 'listOrders()' },
            { name: 'updateOrderStatus', description: 'Update order status', signature: 'updateOrderStatus(id, status)' },
            { name: 'getCustomer', description: 'Get customer', signature: 'getCustomer(id)' },
            { name: 'listCustomers', description: 'List customers', signature: 'listCustomers()' },
          ]},
        { name: 'amazon-sp', functions: [
            { name: 'getOrder', description: 'Get order', signature: 'getOrder(orderId)' },
            { name: 'listOrders', description: 'List orders', signature: 'listOrders({ createdAfter? })' },
            { name: 'getOrderItems', description: 'Get order items', signature: 'getOrderItems(orderId)' },
            { name: 'createFulfillmentOrder', description: 'Create fulfillment', signature: 'createFulfillmentOrder({ sellerFulfillmentOrderId, items })' },
            { name: 'getInventory', description: 'Get inventory', signature: 'getInventory({ sku })' },
            { name: 'listCatalogItems', description: 'List catalog items', signature: 'listCatalogItems()' },
          ]},
        { name: 'etsy', functions: [
            { name: 'createListing', description: 'Create listing', signature: 'createListing({ title, description, price })' },
            { name: 'updateListing', description: 'Update listing', signature: 'updateListing(id, { updates })' },
            { name: 'getListing', description: 'Get listing', signature: 'getListing(id)' },
            { name: 'listListings', description: 'List listings', signature: 'listListings()' },
            { name: 'deleteListing', description: 'Delete listing', signature: 'deleteListing(id)' },
            { name: 'getReceipt', description: 'Get receipt', signature: 'getReceipt(id)' },
            { name: 'listReceipts', description: 'List receipts', signature: 'listReceipts()' },
            { name: 'uploadListingImage', description: 'Upload image', signature: 'uploadListingImage(listingId, { image })' },
          ]},
        { name: 'ebay', functions: [
            { name: 'createListing', description: 'Create listing', signature: 'createListing({ title, description, price })' },
            { name: 'getListing', description: 'Get listing', signature: 'getListing(id)' },
            { name: 'updateListing', description: 'Update listing', signature: 'updateListing(id, { updates })' },
            { name: 'endListing', description: 'End listing', signature: 'endListing(id)' },
            { name: 'getOrder', description: 'Get order', signature: 'getOrder(id)' },
            { name: 'listOrders', description: 'List orders', signature: 'listOrders()' },
            { name: 'fulfillOrder', description: 'Fulfill order', signature: 'fulfillOrder(id, { trackingNumber })' },
          ]},
        { name: 'square', functions: [
            { name: 'createPayment', description: 'Create payment', signature: 'createPayment({ sourceId, amountMoney })' },
            { name: 'getPayment', description: 'Get payment', signature: 'getPayment(id)' },
            { name: 'listPayments', description: 'List payments', signature: 'listPayments()' },
            { name: 'createCustomer', description: 'Create customer', signature: 'createCustomer({ givenName?, emailAddress? })' },
            { name: 'getCustomer', description: 'Get customer', signature: 'getCustomer(id)' },
            { name: 'createOrder', description: 'Create order', signature: 'createOrder({ locationId, lineItems })' },
            { name: 'updateOrder', description: 'Update order', signature: 'updateOrder(id, { updates })' },
          ]},
        { name: 'printful', functions: [
            { name: 'createProduct', description: 'Create product', signature: 'createProduct({ syncVariants })' },
            { name: 'submitOrder', description: 'Submit order', signature: 'submitOrder({ recipient, items })' },
            { name: 'getShippingRates', description: 'Get shipping rates', signature: 'getShippingRates({ recipient, items })' },
            { name: 'getProduct', description: 'Get product', signature: 'getProduct(id)' },
            { name: 'listProducts', description: 'List products', signature: 'listProducts()' },
            { name: 'deleteProduct', description: 'Delete product', signature: 'deleteProduct(id)' },
            { name: 'getOrder', description: 'Get order', signature: 'getOrder(id)' },
            { name: 'listOrders', description: 'List orders', signature: 'listOrders()' },
            { name: 'getCatalogProduct', description: 'Get catalog product', signature: 'getCatalogProduct(id)' },
            { name: 'getCatalogVariant', description: 'Get catalog variant', signature: 'getCatalogVariant(id)' },
          ]},
      ],
    },
    {
      name: 'Content',
      modules: [
        { name: 'medium', functions: [
            { name: 'createPost', description: 'Create Medium post', signature: 'createPost({ title, content, contentFormat? })' },
            { name: 'getPost', description: 'Get post', signature: 'getPost(id)' },
            { name: 'getUser', description: 'Get user profile', signature: 'getUser()' },
            { name: 'listPublications', description: 'List publications', signature: 'listPublications()' },
          ]},
        { name: 'ghost', functions: [
            { name: 'createPost', description: 'Create Ghost post', signature: 'createPost({ title, html?, mobiledoc? })' },
            { name: 'updatePost', description: 'Update post', signature: 'updatePost(id, { updates })' },
            { name: 'getPosts', description: 'Get posts', signature: 'getPosts()' },
            { name: 'getPostById', description: 'Get post by ID', signature: 'getPostById(id)' },
            { name: 'deletePost', description: 'Delete post', signature: 'deletePost(id)' },
            { name: 'publishPost', description: 'Publish post', signature: 'publishPost(id)' },
            { name: 'unpublishPost', description: 'Unpublish post', signature: 'unpublishPost(id)' },
            { name: 'createTag', description: 'Create tag', signature: 'createTag({ name })' },
          ]},
        { name: 'wordpress', functions: [
            { name: 'createPost', description: 'Create WordPress post', signature: 'createPost({ title, content, status? })' },
            { name: 'updatePost', description: 'Update post', signature: 'updatePost(id, { updates })' },
            { name: 'getPost', description: 'Get post', signature: 'getPost(id)' },
            { name: 'listPosts', description: 'List posts', signature: 'listPosts()' },
            { name: 'deletePost', description: 'Delete post', signature: 'deletePost(id)' },
            { name: 'uploadMedia', description: 'Upload media', signature: 'uploadMedia({ file, title? })' },
            { name: 'createPage', description: 'Create page', signature: 'createPage({ title, content })' },
            { name: 'getCategories', description: 'Get categories', signature: 'getCategories()' },
          ]},
        { name: 'unsplash', functions: [
            { name: 'searchPhotos', description: 'Search photos', signature: 'searchPhotos({ query, perPage? })' },
            { name: 'getPhoto', description: 'Get photo', signature: 'getPhoto(id)' },
            { name: 'downloadPhoto', description: 'Download photo', signature: 'downloadPhoto(id)' },
            { name: 'getRandomPhoto', description: 'Get random photo', signature: 'getRandomPhoto({ query?, orientation? })' },
            { name: 'listCollections', description: 'List collections', signature: 'listCollections()' },
            { name: 'getCollection', description: 'Get collection', signature: 'getCollection(id)' },
          ]},
        { name: 'pexels', functions: [
            { name: 'searchPhotos', description: 'Search photos', signature: 'searchPhotos({ query, perPage? })' },
            { name: 'getPhoto', description: 'Get photo', signature: 'getPhoto(id)' },
            { name: 'searchVideos', description: 'Search videos', signature: 'searchVideos({ query, perPage? })' },
            { name: 'getVideo', description: 'Get video', signature: 'getVideo(id)' },
            { name: 'getCuratedPhotos', description: 'Get curated photos', signature: 'getCuratedPhotos({ perPage? })' },
            { name: 'getPopularVideos', description: 'Get popular videos', signature: 'getPopularVideos({ perPage? })' },
          ]},
        { name: 'canva', functions: [
            { name: 'createDesign', description: 'Create design', signature: 'createDesign({ type, title? })' },
            { name: 'getDesign', description: 'Get design', signature: 'getDesign(id)' },
            { name: 'listDesigns', description: 'List designs', signature: 'listDesigns()' },
            { name: 'exportDesign', description: 'Export design', signature: 'exportDesign(id, { format? })' },
            { name: 'deleteDesign', description: 'Delete design', signature: 'deleteDesign(id)' },
          ]},
        { name: 'bannerbear', functions: [
            { name: 'createImage', description: 'Create image', signature: 'createImage({ template, modifications })' },
            { name: 'getImage', description: 'Get image', signature: 'getImage(uid)' },
            { name: 'listTemplates', description: 'List templates', signature: 'listTemplates()' },
            { name: 'getTemplate', description: 'Get template', signature: 'getTemplate(uid)' },
            { name: 'createVideo', description: 'Create video', signature: 'createVideo({ template, modifications })' },
            { name: 'getVideo', description: 'Get video', signature: 'getVideo(uid)' },
          ]},
        { name: 'placid', functions: [
            { name: 'createImage', description: 'Create image', signature: 'createImage({ templateId, layers })' },
            { name: 'getImage', description: 'Get image', signature: 'getImage(pollingUrl)' },
            { name: 'listTemplates', description: 'List templates', signature: 'listTemplates()' },
            { name: 'getTemplate', description: 'Get template', signature: 'getTemplate(id)' },
            { name: 'createPDF', description: 'Create PDF', signature: 'createPDF({ templateId, layers })' },
          ]},
      ],
    },
    {
      name: 'Developer Tools',
      modules: [
        { name: 'github', functions: [
            { name: 'getTrendingRepositories', description: 'Get trending GitHub repositories', signature: 'getTrendingRepositories({ language?, since?, per_page? })' },
            { name: 'createIssue', description: 'Create GitHub issue', signature: 'createIssue({ owner, repo, title, body?, labels?, assignees? })' },
            { name: 'updateIssue', description: 'Update GitHub issue', signature: 'updateIssue(owner, repo, issueNumber, { title?, body?, state?, labels? })' },
            { name: 'listIssues', description: 'List repository issues', signature: 'listIssues(owner, repo, { state?, labels?, per_page? })' },
            { name: 'createPullRequest', description: 'Create pull request', signature: 'createPullRequest(owner, repo, { title, head, base, body?, draft? })' },
            { name: 'listPullRequests', description: 'List pull requests', signature: 'listPullRequests(owner, repo, state?)' },
            { name: 'createRelease', description: 'Create release', signature: 'createRelease(owner, repo, { tagName, name?, body?, draft?, prerelease? })' },
            { name: 'getRepository', description: 'Get repository details', signature: 'getRepository(owner, repo)' },
            { name: 'searchRepositories', description: 'Search repositories', signature: 'searchRepositories(query, sort?, per_page?)' },
            { name: 'addIssueComment', description: 'Add comment to issue', signature: 'addIssueComment(owner, repo, issueNumber, body)' },
          ]},
        { name: 'github-actions', functions: [
            { name: 'triggerWorkflow', description: 'Trigger workflow', signature: 'triggerWorkflow({ owner, repo, workflowId, ref, inputs? })' },
            { name: 'getWorkflowRun', description: 'Get workflow run', signature: 'getWorkflowRun({ owner, repo, runId })' },
            { name: 'listWorkflowRuns', description: 'List workflow runs', signature: 'listWorkflowRuns({ owner, repo, workflowId })' },
            { name: 'listWorkflows', description: 'List workflows', signature: 'listWorkflows({ owner, repo })' },
            { name: 'cancelWorkflowRun', description: 'Cancel workflow run', signature: 'cancelWorkflowRun({ owner, repo, runId })' },
            { name: 'rerunWorkflow', description: 'Rerun workflow', signature: 'rerunWorkflow({ owner, repo, runId })' },
            { name: 'listWorkflowArtifacts', description: 'List artifacts', signature: 'listWorkflowArtifacts({ owner, repo, runId })' },
            { name: 'getWorkflowRunLogs', description: 'Get workflow logs', signature: 'getWorkflowRunLogs({ owner, repo, runId })' },
          ]},
        { name: 'circleci', functions: [
            { name: 'triggerPipeline', description: 'Trigger pipeline', signature: 'triggerPipeline({ projectSlug, branch?, parameters? })' },
            { name: 'getPipeline', description: 'Get pipeline', signature: 'getPipeline(pipelineId)' },
            { name: 'listPipelines', description: 'List pipelines', signature: 'listPipelines({ projectSlug })' },
            { name: 'getWorkflow', description: 'Get workflow', signature: 'getWorkflow(workflowId)' },
            { name: 'cancelWorkflow', description: 'Cancel workflow', signature: 'cancelWorkflow(workflowId)' },
            { name: 'rerunWorkflow', description: 'Rerun workflow', signature: 'rerunWorkflow(workflowId)' },
            { name: 'getJob', description: 'Get job', signature: 'getJob(jobNumber)' },
            { name: 'listArtifacts', description: 'List artifacts', signature: 'listArtifacts(jobNumber)' },
          ]},
        { name: 'jenkins', functions: [
            { name: 'triggerBuild', description: 'Trigger build', signature: 'triggerBuild({ jobName, parameters? })' },
            { name: 'getBuild', description: 'Get build', signature: 'getBuild({ jobName, buildNumber })' },
            { name: 'getLastBuild', description: 'Get last build', signature: 'getLastBuild(jobName)' },
            { name: 'stopBuild', description: 'Stop build', signature: 'stopBuild({ jobName, buildNumber })' },
            { name: 'getBuildLog', description: 'Get build log', signature: 'getBuildLog({ jobName, buildNumber })' },
            { name: 'listJobs', description: 'List jobs', signature: 'listJobs()' },
            { name: 'getJob', description: 'Get job', signature: 'getJob(jobName)' },
          ]},
        { name: 'vercel', functions: [
            { name: 'createDeployment', description: 'Create deployment', signature: 'createDeployment({ name, files, projectSettings? })' },
            { name: 'getDeployment', description: 'Get deployment', signature: 'getDeployment(id)' },
            { name: 'listDeployments', description: 'List deployments', signature: 'listDeployments({ projectId? })' },
            { name: 'cancelDeployment', description: 'Cancel deployment', signature: 'cancelDeployment(id)' },
            { name: 'listProjects', description: 'List projects', signature: 'listProjects()' },
            { name: 'getProject', description: 'Get project', signature: 'getProject(id)' },
            { name: 'createProject', description: 'Create project', signature: 'createProject({ name, framework? })' },
            { name: 'deleteProject', description: 'Delete project', signature: 'deleteProject(id)' },
          ]},
        { name: 'netlify', functions: [
            { name: 'createDeployment', description: 'Create deployment', signature: 'createDeployment({ siteId, files })' },
            { name: 'getDeployment', description: 'Get deployment', signature: 'getDeployment(id)' },
            { name: 'listDeployments', description: 'List deployments', signature: 'listDeployments(siteId)' },
            { name: 'cancelDeployment', description: 'Cancel deployment', signature: 'cancelDeployment(id)' },
            { name: 'getSite', description: 'Get site', signature: 'getSite(id)' },
            { name: 'listSites', description: 'List sites', signature: 'listSites()' },
            { name: 'createSite', description: 'Create site', signature: 'createSite({ name })' },
            { name: 'deleteSite', description: 'Delete site', signature: 'deleteSite(id)' },
          ]},
        { name: 'heroku', functions: [
            { name: 'createApp', description: 'Create app', signature: 'createApp({ name?, region? })' },
            { name: 'getApp', description: 'Get app', signature: 'getApp(id)' },
            { name: 'listApps', description: 'List apps', signature: 'listApps()' },
            { name: 'deleteApp', description: 'Delete app', signature: 'deleteApp(id)' },
            { name: 'restartApp', description: 'Restart app', signature: 'restartApp(id)' },
            { name: 'scaleFormation', description: 'Scale formation', signature: 'scaleFormation({ app, type, quantity })' },
            { name: 'listDynos', description: 'List dynos', signature: 'listDynos(app)' },
            { name: 'restartDyno', description: 'Restart dyno', signature: 'restartDyno({ app, dyno })' },
          ]},
        { name: 'datadog', functions: [
            { name: 'sendMetric', description: 'Send metric', signature: 'sendMetric({ series })' },
            { name: 'sendEvent', description: 'Send event', signature: 'sendEvent({ title, text, tags? })' },
            { name: 'queryMetrics', description: 'Query metrics', signature: 'queryMetrics({ query, from, to })' },
            { name: 'createMonitor', description: 'Create monitor', signature: 'createMonitor({ type, query, name })' },
            { name: 'getMonitor', description: 'Get monitor', signature: 'getMonitor(id)' },
            { name: 'listMonitors', description: 'List monitors', signature: 'listMonitors()' },
            { name: 'deleteMonitor', description: 'Delete monitor', signature: 'deleteMonitor(id)' },
            { name: 'muteMonitor', description: 'Mute monitor', signature: 'muteMonitor(id)' },
          ]},
        { name: 'sentry', functions: [
            { name: 'createIssue', description: 'Create issue', signature: 'createIssue({ title, culprit })' },
            { name: 'getIssue', description: 'Get issue', signature: 'getIssue(id)' },
            { name: 'listIssues', description: 'List issues', signature: 'listIssues({ projectSlug })' },
            { name: 'updateIssue', description: 'Update issue', signature: 'updateIssue(id, { status? })' },
            { name: 'resolveIssue', description: 'Resolve issue', signature: 'resolveIssue(id)' },
            { name: 'listProjects', description: 'List projects', signature: 'listProjects()' },
            { name: 'getProject', description: 'Get project', signature: 'getProject(slug)' },
            { name: 'createProject', description: 'Create project', signature: 'createProject({ name, slug, platform })' },
          ]},
      ],
    },
  ];
}

/**
 * Map category display names to path names
 */
const categoryPathMap: Record<string, string> = {
  'Communication': 'communication',
  'Social Media': 'social',
  'Data': 'data',
  'AI': 'ai',
  'Utilities': 'utilities',
  'Payments': 'payments',
  'Productivity': 'productivity',
  'Data Processing': 'dataprocessing',
  'Video Automation': 'video',
  'Business': 'business',
  'Lead Generation': 'leads',
  'E-Commerce': 'ecommerce',
  'Content': 'content',
  'Developer Tools': 'devtools',
};

/**
 * Generate markdown documentation for LLM context
 */
export function generateModuleDocs(): string {
  logger.info('Generating module documentation for LLM');

  const registry = getModuleRegistry();

  let docs = '# Available Workflow Modules\n\n';
  docs += 'These modules can be used to build workflows. Each function takes inputs and returns outputs that can be used in subsequent steps.\n\n';
  docs += '## Module Path Format\n';
  docs += 'All module paths must use: `category.module.function` (all lowercase)\n\n';
  docs += '**Category Mappings:**\n';
  for (const [display, path] of Object.entries(categoryPathMap)) {
    docs += `- ${display} → \`${path}\`\n`;
  }
  docs += '\n';

  for (const category of registry) {
    const categoryPath = categoryPathMap[category.name] || category.name.toLowerCase();
    docs += `## ${category.name} (category: \`${categoryPath}\`)\n\n`;

    for (const mod of category.modules) {
      docs += `### ${mod.name}\n\n`;

      for (const func of mod.functions) {
        const fullPath = `${categoryPath}.${mod.name}.${func.name}`;
        docs += `**${func.name}** → \`${fullPath}\`\n`;
        docs += `- ${func.description}\n`;
        docs += `- Signature: \`${func.signature}\`\n`;

        if (func.example) {
          docs += `- Example: \`${func.example}\`\n`;
        }

        docs += '\n';
      }
    }
  }

  logger.info({ docLength: docs.length }, 'Module documentation generated');

  return docs;
}

/**
 * Validate if a module function exists
 */
export function validateModuleFunction(modulePath: string): boolean {
  const [category, moduleName, functionName] = modulePath.split('.');

  if (!category || !moduleName || !functionName) {
    return false;
  }

  const registry = getModuleRegistry();

  // Find category by matching the path name
  const categoryData = registry.find(c => {
    const path = categoryPathMap[c.name] || c.name.toLowerCase();
    return path === category.toLowerCase();
  });

  if (!categoryData) return false;

  const moduleData = categoryData.modules.find(m => m.name === moduleName);

  if (!moduleData) return false;

  return moduleData.functions.some(f => f.name === functionName);
}
