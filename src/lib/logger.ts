import pino from 'pino';

/**
 * Structured logging with Pino + File Logging
 *
 * Logs are written to:
 * - logs/app.log (all logs)
 * - logs/error.log (errors only)
 * - Console (development)
 *
 * Note: File rotation can be handled externally (e.g., logrotate, Docker, or Railway's built-in log retention)
 *
 * Usage:
 * logger.info('Tweet generated', { tweetId: '123', content: 'Hello world' });
 * logger.error('Failed to post', { error: err.message });
 * logger.debug('Debug info', { data: someData });
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const enableFileLogs = process.env.ENABLE_FILE_LOGS !== 'false'; // Default: enabled
const isNodeRuntime = process.env.NEXT_RUNTIME !== 'edge';

// Lazy load Node.js modules only when needed (avoid Edge Runtime issues)
let logsDir: string | null = null;
let logFilePath: string | null = null;
let errorLogFilePath: string | null = null;

// Create logs directory if it doesn't exist (only in Node.js runtime)
if (enableFileLogs && typeof window === 'undefined' && isNodeRuntime) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');

    logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    logFilePath = path.join(logsDir, 'app.log');
    errorLogFilePath = path.join(logsDir, 'error.log');
  } catch {
    // Ignore errors in edge runtime or during build
  }
}

// Create file write streams (simple append, no rotation in-process)
const createFileStream = (filePath: string) => {
  if (!isNodeRuntime) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    return fs.createWriteStream(filePath, { flags: 'a' });
  } catch {
    return null;
  }
};

// Create multiple streams (console + files) - only in Node.js runtime
const streams: pino.StreamEntry[] = [];

// Only configure streams in Node.js runtime (not in Edge)
if (isNodeRuntime) {
  // Always log to console in development
  if (isDevelopment) {
    streams.push({
      level: 'debug',
      stream: process.stdout,
    });
  }

  // Add file streams if enabled (only in Node.js runtime)
  if (enableFileLogs && typeof window === 'undefined' && logFilePath && errorLogFilePath) {
    const appStream = createFileStream(logFilePath);
    const errorStream = createFileStream(errorLogFilePath);

    if (appStream) {
      streams.push({
        level: 'info',
        stream: appStream,
      });
    }

    if (errorStream) {
      streams.push({
        level: 'error',
        stream: errorStream,
      });
    }
  }

  // Fallback to stdout if no streams configured (Node.js only)
  if (streams.length === 0) {
    streams.push({
      level: 'info',
      stream: process.stdout,
    });
  }
}

// Create logger with multiple streams (or single stream for Edge runtime)
export const logger = isNodeRuntime && streams.length > 0
  ? pino(
      {
        level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      },
      pino.multistream(streams)
    )
  : pino({
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      browser: {
        asObject: true,
      },
    });

// Helper functions for common logging patterns
export const logJobStart = (jobName: string) => {
  logger.info({ job: jobName }, `🔄 Starting job: ${jobName}`);
};

export const logJobComplete = (jobName: string, duration?: number) => {
  logger.info({ job: jobName, duration }, `✅ Completed job: ${jobName}`);
};

export const logJobError = (jobName: string, error: unknown) => {
  logger.error(
    { job: jobName, error: error instanceof Error ? error.message : String(error) },
    `❌ Job failed: ${jobName}`
  );
};

export const logApiRequest = (method: string, path: string, statusCode: number) => {
  logger.info({ method, path, statusCode }, `${method} ${path} - ${statusCode}`);
};

export const logApiError = (method: string, path: string, error: unknown) => {
  logger.error(
    { method, path, error: error instanceof Error ? error.message : String(error) },
    `API error: ${method} ${path}`
  );
};
