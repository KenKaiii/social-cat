import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from 'axios-retry';
import { logger } from './logger';

/**
 * Axios Configuration with Automatic Retries
 *
 * Provides pre-configured axios instances with:
 * - Automatic retries on network errors and 5xx responses
 * - Exponential backoff (2^attempt * 1000ms)
 * - Request/response logging
 * - Timeout handling
 *
 * Use these instead of creating raw axios instances for better reliability.
 */

interface RetryConfig {
  retries?: number;              // Number of retry attempts (default: 3)
  retryDelay?: (retryCount: number, error: AxiosError) => number;
  retryCondition?: (error: AxiosError) => boolean;
  timeout?: number;              // Request timeout in ms (default: 10000)
  onRetry?: (retryCount: number, error: AxiosError, requestConfig: AxiosRequestConfig) => void;
}

/**
 * Create axios instance with retry logic
 */
export function createAxiosWithRetry(config?: RetryConfig): AxiosInstance {
  const {
    retries = 3,
    retryDelay = exponentialDelay,
    retryCondition = isNetworkOrIdempotentRequestError,
    timeout = 10000,
    onRetry,
  } = config || {};

  const instance = axios.create({
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Configure retry logic
  axiosRetry(instance, {
    retries,
    retryDelay,
    retryCondition,
    onRetry: (retryCount, error, requestConfig) => {
      logger.warn(
        {
          url: requestConfig.url,
          method: requestConfig.method,
          retryCount,
          error: error.message,
        },
        `Retrying request (attempt ${retryCount}/${retries})`
      );

      if (onRetry) {
        onRetry(retryCount, error, requestConfig);
      }
    },
  });

  // Request interceptor for logging
  instance.interceptors.request.use(
    (config) => {
      logger.debug(
        { method: config.method, url: config.url },
        `HTTP Request: ${config.method?.toUpperCase()} ${config.url}`
      );
      return config;
    },
    (error) => {
      logger.error({ error }, 'Request interceptor error');
      return Promise.reject(error);
    }
  );

  // Response interceptor for logging
  instance.interceptors.response.use(
    (response) => {
      logger.debug(
        {
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          duration: response.config.headers?.['request-startTime']
            ? Date.now() - Number(response.config.headers['request-startTime'])
            : undefined,
        },
        `HTTP Response: ${response.status} ${response.config.url}`
      );
      return response;
    },
    (error: AxiosError) => {
      logger.error(
        {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          error: error.message,
        },
        `HTTP Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`
      );
      return Promise.reject(error);
    }
  );

  return instance;
}

/**
 * Pre-configured axios instances for different APIs
 */

// Twitter API - More retries due to rate limiting
export const twitterAxios = createAxiosWithRetry({
  retries: 5,
  timeout: 15000,
  retryCondition: (error) => {
    // Retry on network errors, 5xx, and 429 (rate limit)
    if (isNetworkOrIdempotentRequestError(error)) return true;
    if (error.response?.status === 429) return true;
    return false;
  },
  retryDelay: (retryCount, error) => {
    // Use retry-after header if available
    const retryAfter = error.response?.headers['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter, 10) * 1000;
    }
    // Otherwise exponential backoff
    return exponentialDelay(retryCount, error);
  },
});

// YouTube API - Conservative retries (quota concerns)
export const youtubeAxios = createAxiosWithRetry({
  retries: 3,
  timeout: 10000,
  retryCondition: (error) => {
    // Don't retry on 4xx errors (quota exceeded = 403)
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    return isNetworkOrIdempotentRequestError(error);
  },
});

// OpenAI API - Longer timeout for AI generation
export const openaiAxios = createAxiosWithRetry({
  retries: 3,
  timeout: 60000, // 60 seconds for AI generation
  retryCondition: (error) => {
    // Retry on network errors and 5xx
    // Don't retry on 4xx (likely auth or validation errors)
    if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }
    return isNetworkOrIdempotentRequestError(error);
  },
});

// Instagram API
export const instagramAxios = createAxiosWithRetry({
  retries: 3,
  timeout: 10000,
});

// RapidAPI - Generic configuration
export const rapidApiAxios = createAxiosWithRetry({
  retries: 4,
  timeout: 10000,
  retryCondition: (error) => {
    // RapidAPI specific: Retry on 429 (rate limit)
    if (error.response?.status === 429) return true;
    return isNetworkOrIdempotentRequestError(error);
  },
});

// Generic HTTP client with retry
export const httpClient = createAxiosWithRetry();

/**
 * Helper: Check if error is retryable
 */
export function isRetryableError(error: AxiosError): boolean {
  // Network errors
  if (!error.response) return true;

  // 5xx server errors
  if (error.response.status >= 500) return true;

  // 429 rate limit
  if (error.response.status === 429) return true;

  // Specific retryable status codes
  const retryableStatuses = [408, 502, 503, 504];
  if (retryableStatuses.includes(error.response.status)) return true;

  return false;
}

/**
 * Helper: Extract error message from axios error
 */
export function getAxiosErrorMessage(error: AxiosError): string {
  if (error.response?.data) {
    const data = error.response.data as Record<string, unknown>;
    return (data.message as string) || (data.error as string) || (data.error_message as string) || error.message;
  }
  return error.message;
}

/**
 * Example usage:
 *
 * // Use pre-configured instance
 * const response = await twitterAxios.get('https://api.twitter.com/2/tweets');
 *
 * // Create custom instance
 * const customAxios = createAxiosWithRetry({
 *   retries: 5,
 *   timeout: 30000,
 *   onRetry: (retryCount) => console.log(`Retry #${retryCount}`),
 * });
 *
 * // Use in existing code (replace axios with twitterAxios, etc.)
 * // Before: axios.post(url, data)
 * // After:  twitterAxios.post(url, data)
 */
