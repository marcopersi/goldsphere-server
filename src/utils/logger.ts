/**
 * Logger Utility
 *
 * Provides structured logging with context across the application.
 * Can be extended to use external logging services in production.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service?: string;
  method?: string;
  [key: string]: unknown;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): void;
}

/**
 * Create a logger instance for a specific service
 */
export function createLogger(serviceName: string): ILogger {
  const formatMessage = (level: LogLevel, message: string, context?: LogContext): string => {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] [${serviceName}] ${message}${contextStr}`;
  };

  return {
    debug(message: string, context?: LogContext): void {
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug(formatMessage('debug', message, context));
      }
    },

    info(message: string, context?: LogContext): void {
      console.info(formatMessage('info', message, context));
    },

    warn(message: string, context?: LogContext): void {
      console.warn(formatMessage('warn', message, context));
    },

    error(message: string, error?: unknown, context?: LogContext): void {
      const errorDetails = error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : error ? { errorMessage: String(error) } : {};
      
      console.error(formatMessage('error', message, { ...context, ...errorDetails }));
    }
  };
}

/**
 * Default logger instance for general use
 */
export const logger = createLogger('App');
