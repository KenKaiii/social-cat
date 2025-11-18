/**
 * Centralized timeout and interval constants
 * Used across modules for consistent timing behavior
 */

/**
 * Standard timeout durations (in milliseconds)
 */
export const TIMEOUTS = {
  /** Default timeout for API requests (30 seconds) */
  DEFAULT: 30000,

  /** Short timeout for quick operations (10 seconds) */
  SHORT: 10000,

  /** Long timeout for heavy operations like video processing (2 minutes) */
  LONG: 120000,

  /** Upload timeout for large files (5 minutes) */
  UPLOAD: 300000,

  /** Very long timeout for polling operations (10 minutes) */
  POLLING_LONG: 600000,

  /** Webhook processing timeout (30 seconds) */
  WEBHOOK: 30000,

  /** Workflow execution timeout (5 minutes) */
  WORKFLOW_EXECUTION: 300000,

  /** Stream timeout (5 minutes) */
  STREAM: 300000,
} as const;

/**
 * Rate limiting intervals (in milliseconds)
 */
export const RATE_LIMIT_INTERVALS = {
  /** 600ms between requests */
  CALENDLY: 600,

  /** 1200ms between requests */
  LINEAR: 1200,

  /** 3000ms between requests */
  SOCIAL_MEDIA: 3000,

  /** 3600ms between requests */
  YOUTUBE: 3600,
} as const;

/**
 * Retry delays (in milliseconds)
 */
export const RETRY_DELAYS = {
  /** Initial retry delay (1 second) */
  INITIAL: 1000,

  /** Maximum retry delay (5 seconds) */
  MAX: 5000,

  /** Exponential backoff multiplier */
  MULTIPLIER: 2,
} as const;

/**
 * Cache expiration times (in milliseconds)
 */
export const CACHE_TTL = {
  /** Short-lived cache (5 minutes) */
  SHORT: 300000,

  /** Medium cache duration (1 hour) */
  MEDIUM: 3600000,

  /** Long cache duration (24 hours) */
  LONG: 86400000,

  /** Credentials cache (30 seconds) */
  CREDENTIALS: 30000,

  /** Settings cache (5 minutes) */
  SETTINGS: 300000,
} as const;

/**
 * Job retention durations (in seconds)
 */
export const JOB_RETENTION = {
  /** Keep completed jobs for 24 hours */
  COMPLETED_JOBS_AGE_SECONDS: 86400,

  /** Keep max 1000 completed jobs */
  COMPLETED_JOBS_MAX_COUNT: 1000,

  /** Keep failed jobs for 7 days */
  FAILED_JOBS_AGE_SECONDS: 604800,

  /** Keep max 5000 failed jobs */
  FAILED_JOBS_MAX_COUNT: 5000,
} as const;

/**
 * Database connection settings
 */
export const DATABASE = {
  /** Connection timeout (30 seconds) */
  CONNECTION_TIMEOUT_MS: 30000,

  /** Idle timeout (30 seconds) */
  IDLE_TIMEOUT_MS: 30000,

  /** Default max connections */
  POOL_MAX: 30,

  /** Default min connections */
  POOL_MIN: 5,
} as const;

/**
 * Security settings
 */
export const SECURITY = {
  /** HSTS max age (1 year in seconds) */
  HSTS_MAX_AGE: 31536000,

  /** Invitation expiry (7 days in milliseconds) */
  INVITATION_EXPIRY_MS: 604800000,
} as const;
