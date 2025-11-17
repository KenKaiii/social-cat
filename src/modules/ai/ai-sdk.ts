import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText as aiGenerateText, streamText, generateObject } from 'ai';
import { createCircuitBreaker } from '@/lib/resilience';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { AIProvider } from '@/lib/ai-models';

/**
 * AI SDK Module - Unified AI Provider
 *
 * Uses Vercel AI SDK to provide multi-provider AI capabilities:
 * - OpenAI (GPT-5, GPT-4.5, GPT-4o, o3, etc.)
 * - Anthropic (Claude 4.5, Claude 3.5 Sonnet, Haiku, Opus)
 * - OpenRouter (Access to hundreds of models from multiple providers)
 *   - Google Gemini
 *   - Meta Llama
 *   - Mistral
 *   - Cohere
 *   - DeepSeek
 *   - Perplexity
 *   - And many more
 * - Unified API across all providers
 * - Built-in streaming support
 * - Circuit breakers and rate limiting
 * - Structured logging
 *
 * Perfect for:
 * - Content generation
 * - Code generation
 * - Data analysis
 * - Intelligent automation
 * - Multi-turn conversations
 */

// Rate limiter: Conservative limits for API usage
const aiRateLimiter = createRateLimiter({
  maxConcurrent: 5,
  minTime: 200, // 200ms between requests
  reservoir: 500,
  reservoirRefreshAmount: 500,
  reservoirRefreshInterval: 60 * 1000,
  id: 'ai-sdk',
});

export type AIModel = string;

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerateOptions {
  prompt: string;
  systemPrompt?: string;
  model?: AIModel;
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface AIChatOptions {
  messages: AIMessage[];
  model?: AIModel;
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

export interface AIStreamOptions extends AIGenerateOptions {
  onChunk?: (chunk: string) => void;
}

export interface AIGenerateResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  model: string;
  provider: AIProvider;
}

/**
 * Get the AI model instance based on provider and model name
 */
function getModelInstance(provider: AIProvider, modelName: string, apiKey?: string) {
  if (provider === 'openai') {
    if (!apiKey) {
      throw new Error(
        'OpenAI API key not found. Please add an OpenAI API key in the credentials page.'
      );
    }
    const openaiProvider = createOpenAI({
      apiKey: apiKey,
    });
    return openaiProvider(modelName);
  } else if (provider === 'anthropic') {
    if (!apiKey) {
      throw new Error(
        'Anthropic API key not found. Please add an Anthropic API key in the credentials page.'
      );
    }
    const anthropicProvider = createAnthropic({
      apiKey: apiKey,
    });
    return anthropicProvider(modelName);
  } else if (provider === 'openrouter') {
    if (!apiKey) {
      throw new Error(
        'OpenRouter API key not found. Please add an OpenRouter API key in the credentials page.'
      );
    }
    const openrouterProvider = createOpenRouter({
      apiKey: apiKey,
    });
    return openrouterProvider.chat(modelName);
  }
  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Detect provider from model name
 */
function detectProvider(model?: string): AIProvider {
  if (!model) return 'openai'; // default

  // OpenRouter models contain a slash (e.g., 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet')
  if (model.includes('/')) {
    return 'openrouter';
  }

  if (
    model.startsWith('gpt-') ||
    model.startsWith('o1') ||
    model.startsWith('o3')
  ) {
    return 'openai';
  }

  if (model.startsWith('claude-')) {
    return 'anthropic';
  }

  return 'openai'; // default
}

/**
 * Internal generate text function (unprotected)
 */
async function generateTextInternal(
  options: AIGenerateOptions
): Promise<AIGenerateResponse> {
  const {
    prompt,
    systemPrompt,
    model = 'gpt-4o-mini',
    provider: explicitProvider,
    temperature = 0.7,
    maxTokens = 4096,
    apiKey,
  } = options;

  const provider = explicitProvider || detectProvider(model);

  logger.info(
    {
      model,
      provider,
      promptLength: prompt.length,
      hasSystemPrompt: !!systemPrompt,
    },
    'Generating text with AI SDK'
  );

  const modelInstance = getModelInstance(provider, model, apiKey);

  const result = await aiGenerateText({
    model: modelInstance,
    prompt,
    system: systemPrompt,
    temperature,
    maxOutputTokens: maxTokens,
  });

  logger.info(
    {
      promptTokens: result.usage.inputTokens,
      completionTokens: result.usage.outputTokens,
      finishReason: result.finishReason,
    },
    'AI text generation completed'
  );

  return {
    content: result.text,
    usage: {
      promptTokens: result.usage.inputTokens || 0,
      completionTokens: result.usage.outputTokens || 0,
      totalTokens: result.usage.totalTokens || 0,
    },
    finishReason: result.finishReason,
    model,
    provider,
  };
}

/**
 * Generate text with circuit breaker and rate limiting
 */
const generateTextWithBreaker = createCircuitBreaker(generateTextInternal, {
  timeout: 60000, // 60 seconds for AI generation
  name: 'ai-sdk-generate-text',
});

const generateTextRateLimited = withRateLimit(
  async (options: AIGenerateOptions) =>
    generateTextWithBreaker.fire(options),
  aiRateLimiter
);

/**
 * Generate text (main export)
 */
export async function generateText(
  options: AIGenerateOptions
): Promise<AIGenerateResponse> {
  return (await generateTextRateLimited(options)) as unknown as AIGenerateResponse;
}

/**
 * Chat with conversation history
 */
async function chatInternal(
  options: AIChatOptions
): Promise<AIGenerateResponse> {
  const {
    messages,
    model = 'gpt-4o-mini',
    provider: explicitProvider,
    temperature = 0.7,
    maxTokens = 4096,
    apiKey,
  } = options;

  const provider = explicitProvider || detectProvider(model);

  logger.info(
    {
      model,
      provider,
      messageCount: messages.length,
    },
    'Starting chat with AI SDK'
  );

  const modelInstance = getModelInstance(provider, model, apiKey);

  // Convert messages to AI SDK format
  const systemMessage = messages.find((m) => m.role === 'system');
  const conversationMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const result = await aiGenerateText({
    model: modelInstance,
    messages: conversationMessages,
    system: systemMessage?.content,
    temperature,
    maxOutputTokens: maxTokens,
  });

  logger.info(
    {
      promptTokens: result.usage.inputTokens,
      completionTokens: result.usage.outputTokens,
      finishReason: result.finishReason,
    },
    'AI chat completed'
  );

  return {
    content: result.text,
    usage: {
      promptTokens: result.usage.inputTokens || 0,
      completionTokens: result.usage.outputTokens || 0,
      totalTokens: result.usage.totalTokens || 0,
    },
    finishReason: result.finishReason,
    model,
    provider,
  };
}

const chatWithBreaker = createCircuitBreaker(chatInternal, {
  timeout: 60000,
  name: 'ai-sdk-chat',
});

const chatRateLimited = withRateLimit(
  async (options: AIChatOptions) => chatWithBreaker.fire(options),
  aiRateLimiter
);

export async function chat(options: AIChatOptions): Promise<AIGenerateResponse> {
  return (await chatRateLimited(options)) as unknown as AIGenerateResponse;
}

/**
 * Stream text generation
 */
export async function* streamGeneration(
  options: AIStreamOptions
): AsyncGenerator<string> {
  const {
    prompt,
    systemPrompt,
    model = 'gpt-4o-mini',
    provider: explicitProvider,
    temperature = 0.7,
    maxTokens = 4096,
    apiKey,
  } = options;

  const provider = explicitProvider || detectProvider(model);

  logger.info(
    {
      model,
      provider,
      promptLength: prompt.length,
    },
    'Starting AI SDK stream'
  );

  const modelInstance = getModelInstance(provider, model, apiKey);

  const result = streamText({
    model: modelInstance,
    prompt,
    system: systemPrompt,
    temperature,
    maxOutputTokens: maxTokens,
  });

  for await (const chunk of result.textStream) {
    yield chunk;
  }

  logger.info('AI SDK stream completed');
}

/**
 * Generate structured JSON output
 */
export async function generateJSON<T = unknown>(
  options: AIGenerateOptions & {
    schema: z.ZodSchema<T>;
  }
): Promise<T> {
  const {
    prompt,
    systemPrompt,
    model = 'gpt-4o-mini',
    provider: explicitProvider,
    temperature = 0.7,
    apiKey,
    schema,
  } = options;

  const provider = explicitProvider || detectProvider(model);

  logger.info(
    {
      model,
      provider,
      promptLength: prompt.length,
    },
    'Generating structured JSON with AI SDK'
  );

  const modelInstance = getModelInstance(provider, model, apiKey);

  const result = await generateObject({
    model: modelInstance,
    prompt,
    system: systemPrompt,
    schema,
    temperature,
    mode: 'json',
  });

  logger.info('JSON generation completed');

  return result.object;
}

/**
 * Convenience functions
 */

/**
 * Fast generation with GPT-4o-mini
 */
export async function generateFast(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string
): Promise<string> {
  const result = await generateText({
    prompt,
    systemPrompt,
    model: 'gpt-4o-mini',
    provider: 'openai',
    temperature: 0.8,
    apiKey,
  });
  return result.content;
}

/**
 * High quality generation with GPT-4o
 */
export async function generateQuality(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string
): Promise<string> {
  const result = await generateText({
    prompt,
    systemPrompt,
    model: 'gpt-4o',
    provider: 'openai',
    temperature: 0.7,
    apiKey,
  });
  return result.content;
}

/**
 * Fast Claude generation with Haiku
 */
export async function generateClaudeFast(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string
): Promise<string> {
  const result = await generateText({
    prompt,
    systemPrompt,
    model: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    temperature: 0.8,
    apiKey,
  });
  return result.content;
}

/**
 * High quality Claude generation with Sonnet
 */
export async function generateClaudeQuality(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string
): Promise<string> {
  const result = await generateText({
    prompt,
    systemPrompt,
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    temperature: 0.7,
    apiKey,
  });
  return result.content;
}
