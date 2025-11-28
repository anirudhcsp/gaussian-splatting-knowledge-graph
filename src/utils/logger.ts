import winston from 'winston';
import { config } from './config';

/**
 * Configure Winston logger with custom formatting
 */
const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'knowledge-graph' },
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      ),
    }),
    // File output for errors
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: winston.format.json()
    }),
    // File output for all logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: winston.format.json()
    }),
  ],
});

/**
 * Create a child logger with specific metadata
 */
export function createLogger(metadata: Record<string, any>) {
  return logger.child(metadata);
}

/**
 * Default logger export
 */
export default logger;

/**
 * Helper functions for common logging patterns
 */
export const log = {
  info: (message: string, meta?: Record<string, any>) => logger.info(message, meta),
  error: (message: string, error?: Error | unknown, meta?: Record<string, any>) => {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else {
      logger.error(message, { error, ...meta });
    }
  },
  warn: (message: string, meta?: Record<string, any>) => logger.warn(message, meta),
  debug: (message: string, meta?: Record<string, any>) => logger.debug(message, meta),
  
  // Agent-specific logging
  agent: (agentName: string, message: string, meta?: Record<string, any>) => {
    logger.info(message, { agent: agentName, ...meta });
  },
  
  // Task logging
  task: (taskId: string, message: string, meta?: Record<string, any>) => {
    logger.info(message, { taskId, ...meta });
  },
};