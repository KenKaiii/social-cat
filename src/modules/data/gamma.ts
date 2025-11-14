/**
 * Gamma API Client with Reliability Infrastructure
 *
 * Gamma is an AI-powered presentation creation platform that generates
 * beautiful decks, documents, webpages, and social media posts from text.
 *
 * Features:
 * - Circuit breaker to prevent hammering failing API
 * - Rate limiting for API quota management
 * - Structured logging
 * - Automatic error handling
 * - Async generation with status polling
 *
 * API Documentation: https://developers.gamma.app
 *
 * @module data/gamma
 */

import { logger } from '@/lib/logger';
import { createCircuitBreaker } from '@/lib/resilience';
import { createRateLimiter, withRateLimit } from '@/lib/rate-limiter';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GammaCredentials {
  apiKey?: string;
}

export type GammaFormat = 'presentation' | 'document' | 'webpage' | 'social';
export type TextMode = 'generate' | 'condense' | 'preserve';
export type TextAmount = 'brief' | 'medium' | 'detailed' | 'extensive';
export type ImageSource =
  | 'aiGenerated'
  | 'pictographic'
  | 'unsplash'
  | 'giphy'
  | 'webAllImages'
  | 'webFreeToUse'
  | 'webFreeToUseCommercially'
  | 'placeholder'
  | 'noImages';

export interface TextOptions {
  amount?: TextAmount;
  tone?: string;
  audience?: string;
  language?: string;
}

export interface ImageOptions {
  source?: ImageSource;
  model?: string;
  style?: string;
}

export interface GenerateGammaOptions extends GammaCredentials {
  inputText: string;
  textMode?: TextMode;
  format?: GammaFormat;
  themeId?: string;
  numCards?: number;
  cardSplit?: 'auto' | 'inputTextBreaks';
  additionalInstructions?: string;
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx';
  textOptions?: TextOptions;
  imageOptions?: ImageOptions;
}

export interface GetGenerationStatusOptions extends GammaCredentials {
  generationId: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface GammaGenerationResponse {
  generationId: string;
  status?: 'pending' | 'completed' | 'failed';
  gammaUrl?: string;
  credits?: {
    deducted: number;
    remaining: number;
  };
  error?: string;
}

// ============================================================================
// CREDENTIAL DETECTION
// ============================================================================

const GAMMA_API_KEY = process.env.GAMMA_API_KEY;

if (!GAMMA_API_KEY) {
  logger.warn('⚠️  Gamma API key not set. Features will not work.');
}

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

const GAMMA_API_BASE = 'https://public-api.gamma.app/v1.0';

/**
 * Get API key from credentials or environment
 */
function getApiKey(credentials?: GammaCredentials): string {
  const apiKey = credentials?.apiKey || GAMMA_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Gamma API key not found. Provide apiKey parameter or set GAMMA_API_KEY environment variable.'
    );
  }

  return apiKey;
}

/**
 * Make authenticated API request to Gamma
 */
async function gammaRequest<T>(
  endpoint: string,
  options: {
    method: 'GET' | 'POST';
    apiKey: string;
    body?: unknown;
  }
): Promise<T> {
  const url = `${GAMMA_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: options.method,
    headers: {
      'X-API-KEY': options.apiKey,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gamma API error (${response.status}): ${errorText}`
    );
  }

  return await response.json() as T;
}

// ============================================================================
// RATE LIMITER CONFIGURATION
// ============================================================================

const rateLimiter = createRateLimiter({
  maxConcurrent: 3,              // Max 3 parallel requests
  minTime: 1000,                 // Min 1s between requests
  reservoir: 60,                 // 60 requests per window
  reservoirRefreshAmount: 60,    // Refill 60 tokens
  reservoirRefreshInterval: 60000, // Every 60 seconds
  id: 'gamma',
});

// ============================================================================
// INTERNAL FUNCTIONS (UNPROTECTED)
// ============================================================================

/**
 * Internal implementation of generateGamma
 */
async function generateGammaInternal(
  options: GenerateGammaOptions
): Promise<GammaGenerationResponse> {
  logger.info({ format: options.format, textMode: options.textMode }, 'Starting Gamma generation');

  const apiKey = getApiKey(options);

  try {
    const requestBody = {
      inputText: options.inputText,
      textMode: options.textMode || 'generate',
      format: options.format || 'presentation',
      ...(options.themeId && { themeId: options.themeId }),
      ...(options.numCards && { numCards: options.numCards }),
      ...(options.cardSplit && { cardSplit: options.cardSplit }),
      ...(options.additionalInstructions && { additionalInstructions: options.additionalInstructions }),
      ...(options.folderIds && { folderIds: options.folderIds }),
      ...(options.exportAs && { exportAs: options.exportAs }),
      ...(options.textOptions && { textOptions: options.textOptions }),
      ...(options.imageOptions && { imageOptions: options.imageOptions }),
    };

    const result = await gammaRequest<GammaGenerationResponse>('/generations', {
      method: 'POST',
      apiKey,
      body: requestBody,
    });

    logger.info(
      { generationId: result.generationId },
      'Gamma generation started'
    );
    return result;
  } catch (error) {
    logger.error({ error }, 'Failed to start Gamma generation');
    throw new Error(`Generate gamma failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Internal implementation of getGenerationStatus
 */
async function getGenerationStatusInternal(
  options: GetGenerationStatusOptions
): Promise<GammaGenerationResponse> {
  logger.info({ generationId: options.generationId }, 'Checking Gamma generation status');

  const apiKey = getApiKey(options);

  try {
    const result = await gammaRequest<GammaGenerationResponse>(
      `/generations/${options.generationId}`,
      {
        method: 'GET',
        apiKey,
      }
    );

    logger.info(
      { generationId: result.generationId, status: result.status },
      'Gamma generation status retrieved'
    );
    return result;
  } catch (error) {
    logger.error(
      { error, generationId: options.generationId },
      'Failed to get Gamma generation status'
    );
    throw new Error(`Get generation status failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Internal implementation of waitForCompletion
 */
async function waitForCompletionInternal(
  options: GetGenerationStatusOptions
): Promise<GammaGenerationResponse> {
  const maxRetries = options.maxRetries || 60; // 60 retries = 5 minutes max
  const retryDelay = options.retryDelayMs || 5000; // 5 seconds between checks

  logger.info(
    { generationId: options.generationId, maxRetries, retryDelay },
    'Waiting for Gamma generation to complete'
  );

  for (let i = 0; i < maxRetries; i++) {
    const status = await getGenerationStatusInternal(options);

    if (status.status === 'completed') {
      logger.info(
        { generationId: status.generationId, gammaUrl: status.gammaUrl },
        'Gamma generation completed'
      );
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(`Generation failed: ${status.error || 'Unknown error'}`);
    }

    // Still pending, wait and retry
    logger.info(
      { generationId: status.generationId, attempt: i + 1, maxRetries },
      'Generation still pending, waiting...'
    );
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  throw new Error(`Generation timed out after ${maxRetries} retries`);
}

// ============================================================================
// PROTECTED EXPORTS (WITH CIRCUIT BREAKER + RATE LIMITING)
// ============================================================================

const generateGammaWithBreaker = createCircuitBreaker(
  generateGammaInternal,
  {
    timeout: 30000, // 30s for API request
    name: 'gamma.generateGamma',
  }
);

/**
 * Generate a new Gamma presentation, document, webpage, or social post
 *
 * This starts an async generation process. Use getGenerationStatus or
 * waitForCompletion to check/wait for the result.
 *
 * @param options - Generation parameters
 * @param options.inputText - Content to generate from (required, max 100k tokens)
 * @param options.textMode - How to process text: 'generate', 'condense', 'preserve' (default: 'generate')
 * @param options.format - Output type: 'presentation', 'document', 'webpage', 'social' (default: 'presentation')
 * @param options.themeId - Theme identifier (use listThemes to get available themes)
 * @param options.numCards - Number of cards/slides (1-60 for Pro, 1-75 for Ultra)
 * @param options.additionalInstructions - Extra instructions for generation
 * @param options.textOptions - Text customization (amount, tone, audience, language)
 * @param options.imageOptions - Image settings (source, model, style)
 * @param options.apiKey - Gamma API key (optional if GAMMA_API_KEY env var is set)
 * @returns Generation response with ID and initial status
 *
 * @example
 * const generation = await generateGamma({
 *   inputText: '# My Presentation\n\n## Slide 1\nContent here',
 *   format: 'presentation',
 *   numCards: 10,
 *   textOptions: { amount: 'medium', language: 'en' }
 * });
 * console.log('Generation ID:', generation.generationId);
 */
export const generateGamma = withRateLimit(
  (options: GenerateGammaOptions) => generateGammaWithBreaker.fire(options),
  rateLimiter
);

const getGenerationStatusWithBreaker = createCircuitBreaker(
  getGenerationStatusInternal,
  {
    timeout: 15000,
    name: 'gamma.getGenerationStatus',
  }
);

/**
 * Check the status of a Gamma generation
 *
 * Poll this endpoint to see if your generation is complete. Returns
 * status, and gammaUrl when completed.
 *
 * @param options - Status check parameters
 * @param options.generationId - The generation ID to check
 * @param options.apiKey - Gamma API key (optional if GAMMA_API_KEY env var is set)
 * @returns Generation status and gammaUrl if completed
 *
 * @example
 * const status = await getGenerationStatus({
 *   generationId: 'gen_abc123'
 * });
 * if (status.status === 'completed') {
 *   console.log('Gamma URL:', status.gammaUrl);
 * }
 */
export const getGenerationStatus = withRateLimit(
  (options: GetGenerationStatusOptions) => getGenerationStatusWithBreaker.fire(options),
  rateLimiter
);

const waitForCompletionWithBreaker = createCircuitBreaker(
  waitForCompletionInternal,
  {
    timeout: 300000, // 5 minutes total timeout
    name: 'gamma.waitForCompletion',
  }
);

/**
 * Wait for a Gamma generation to complete
 *
 * Polls the generation status until it completes or times out.
 * Convenient wrapper around getGenerationStatus for synchronous-style usage.
 *
 * @param options - Wait parameters
 * @param options.generationId - The generation ID to wait for
 * @param options.maxRetries - Maximum number of status checks (default: 60)
 * @param options.retryDelayMs - Delay between checks in ms (default: 5000)
 * @param options.apiKey - Gamma API key (optional if GAMMA_API_KEY env var is set)
 * @returns Completed generation with gammaUrl
 *
 * @example
 * const generation = await generateGamma({ inputText: '...' });
 * const completed = await waitForCompletion({
 *   generationId: generation.generationId,
 *   maxRetries: 60,  // 5 minutes max
 *   retryDelayMs: 5000  // Check every 5 seconds
 * });
 * console.log('View your gamma:', completed.gammaUrl);
 */
export const waitForCompletion = withRateLimit(
  (options: GetGenerationStatusOptions) => waitForCompletionWithBreaker.fire(options),
  rateLimiter
);
