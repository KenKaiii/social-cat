import OpenAI from 'openai';
import { createOpenAICircuitBreaker } from './resilience';
import { openaiRateLimiter, withRateLimit } from './rate-limiter';
import { logger } from './logger';

/**
 * OpenAI API Client with Reliability Infrastructure
 *
 * Features:
 * - Circuit breaker to prevent hammering failing API
 * - Rate limiting (500 req/min)
 * - Structured logging
 * - 60s timeout for AI generation
 */

if (!process.env.OPENAI_API_KEY) {
  logger.warn('⚠️  OPENAI_API_KEY is not set. OpenAI features will not work.');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: 60000, // 60 second timeout
});

async function generateTweetInternal(prompt: string): Promise<string> {
  logger.info({ promptLength: prompt.length }, 'Generating tweet with AI');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a social media expert who creates engaging, concise tweets. Keep tweets under 280 characters.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 100,
    temperature: 0.8,
  });

  const result = completion.choices[0]?.message?.content || '';
  logger.info({ resultLength: result.length }, 'Tweet generated successfully');
  return result;
}

/**
 * Generate tweet (protected with circuit breaker + rate limiting)
 */
const generateTweetWithBreaker = createOpenAICircuitBreaker(generateTweetInternal);
export const generateTweet = withRateLimit(
  (prompt: string) => generateTweetWithBreaker.fire(prompt),
  openaiRateLimiter
);

async function generateTweetReplyInternal(
  originalTweet: string,
  systemPrompt?: string,
  useDefaultPrompt: boolean = true
): Promise<string> {
  logger.info(
    { originalTweetLength: originalTweet.length, hasSystemPrompt: !!systemPrompt },
    'Generating tweet reply with AI'
  );

  const defaultSystemPrompt = `You are a helpful and engaging social media assistant. Your goal is to create thoughtful, relevant replies to tweets.

Guidelines:
- Keep replies under 280 characters
- Be conversational and authentic
- Add value to the conversation
- Match the tone of the original tweet
- Avoid being overly promotional
- Use emojis sparingly and only when appropriate
- Never be controversial or offensive`;

  // Determine which prompt to use
  let finalPrompt: string;
  if (systemPrompt !== undefined && systemPrompt !== null) {
    // Use provided prompt (even if empty string)
    finalPrompt = systemPrompt;
  } else if (useDefaultPrompt) {
    // Use default only if explicitly allowed and no prompt provided
    finalPrompt = defaultSystemPrompt;
  } else {
    // No prompt at all
    finalPrompt = '';
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Only add system message if there's a prompt
  if (finalPrompt) {
    messages.push({
      role: 'system',
      content: finalPrompt,
    });
  }

  messages.push({
    role: 'user',
    content: `Generate a reply to this tweet:\n\n"${originalTweet}"`,
  });

  const completion = await openai.chat.completions.create({
    model: 'chatgpt-4o-latest-2025-03-27',
    messages,
    max_tokens: 100,
    temperature: 0.7,
  });

  const result = completion.choices[0]?.message?.content || '';
  logger.info({ replyLength: result.length }, 'Tweet reply generated successfully');
  return result;
}

/**
 * Generate tweet reply (protected with circuit breaker + rate limiting)
 */
const generateTweetReplyWithBreaker = createOpenAICircuitBreaker(generateTweetReplyInternal);
export const generateTweetReply = withRateLimit(
  (originalTweet: string, systemPrompt?: string, useDefaultPrompt?: boolean) =>
    generateTweetReplyWithBreaker.fire(originalTweet, systemPrompt, useDefaultPrompt),
  openaiRateLimiter
);
