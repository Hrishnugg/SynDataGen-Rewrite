/**
 * Simple logger utility for consistent logging throughout the application
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  metadata?: Record<string, any>;
  timestamp?: boolean;
}

// Configure logger for different environments
const isProd = process.env.NODE_ENV === 'production';

/**
 * Format a log message with timestamp and optional metadata
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  options?: LogOptions
): string {
  const timestamp = options?.timestamp !== false ? new Date().toISOString() : '';
  const metadata = options?.metadata ? ` ${JSON.stringify(options.metadata)}` : '';
  
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metadata}`;
}

/**
 * Log utility for application-wide logging
 */
export const logger = {
  /**
   * Log informational message
   */
  info(message: string, metadata?: Record<string, any>): void {
    console.log(formatLogMessage('info', message, { metadata }));
  },

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    console.warn(formatLogMessage('warn', message, { metadata }));
  },

  /**
   * Log error message
   */
  error(message: string, error?: any): void {
    console.error(formatLogMessage('error', message));
    if (error) {
      // In production, we might want to sanitize error output
      if (isProd) {
        // Only log essential error info in production
        const safeError = {
          name: error.name,
          message: error.message,
          code: error.code,
        };
        console.error(safeError);
      } else {
        // Log full error details in development
        console.error(error);
      }
    }
  },

  /**
   * Log debug message (only in non-production)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    if (!isProd) {
      console.debug(formatLogMessage('debug', message, { metadata }));
    }
  },
};

/**
 * Create a new logger instance with a prefix for a specific module/component
 */
export function createPrefixedLogger(prefix: string) {
  return {
    info(message: string, metadata?: Record<string, any>): void {
      logger.info(`[${prefix}] ${message}`, metadata);
    },
    warn(message: string, metadata?: Record<string, any>): void {
      logger.warn(`[${prefix}] ${message}`, metadata);
    },
    error(message: string, error?: any): void {
      logger.error(`[${prefix}] ${message}`, error);
    },
    debug(message: string, metadata?: Record<string, any>): void {
      logger.debug(`[${prefix}] ${message}`, metadata);
    },
  };
} 