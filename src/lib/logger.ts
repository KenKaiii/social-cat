import pino from 'pino';
import path from 'path';
import fs from 'fs';

/**
 * Structured logging with Pino + File Logging
 *
 * Logs are written to:
 * - logs/app.log (all logs)
 * - logs/error.log (errors only)
 * - Console (development)
 *
 * Note: File rotation will be handled externally (e.g., logrotate, Docker, or cloud logging)
 * For production with rotation, consider using pino-roll in a standalone process or external log management.
 *
 * Usage:
 * logger.info('Tweet generated', { tweetId: '123', content: 'Hello world' });
 * logger.error('Failed to post', { error: err.message });
 * logger.debug('Debug info', { data: someData });
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const enableFileLogs = process.env.ENABLE_FILE_LOGS !== 'false'; // Default: enabled

// Create logs directory if it doesn't exist (only on server-side)
const logsDir = path.join(process.cwd(), 'logs');
if (enableFileLogs && typeof window === 'undefined') {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch {
    // Ignore errors in edge runtime or during build
  }
}

// Configure file paths
const logFilePath = path.join(logsDir, 'app.log');
const errorLogFilePath = path.join(logsDir, 'error.log');

// Create file write streams (simple append, no rotation in-process)
const createFileStream = (filePath: string) => {
  try {
    return fs.createWriteStream(filePath, { flags: 'a' });
  } catch {
    return null;
  }
};

// Create multiple streams (console + files)
const streams: pino.StreamEntry[] = [];

// Always log to console in development
if (isDevelopment) {
  streams.push({
    level: 'debug',
    stream: process.stdout,
  });
}

// Add file streams if enabled (only on server-side)
if (enableFileLogs && typeof window === 'undefined') {
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

// Fallback to stdout if no streams configured
if (streams.length === 0) {
  streams.push({
    level: 'info',
    stream: process.stdout,
  });
}

// Create logger with multiple streams
export const logger = pino(
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
);

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
