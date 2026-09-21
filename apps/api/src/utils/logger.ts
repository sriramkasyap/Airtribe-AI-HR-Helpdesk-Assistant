import { LoggerOptions } from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
  }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'MONGODB_URI',
      'OPENROUTER_API_KEY',
      // Axios error dumps embed the outbound request headers — censor the key
      'err.config.headers.Authorization',
      'err.request._header',
      'err.config.request.headers.Authorization',
    ],
    censor: '[REDACTED]',
  },
};

export const logger = require('pino')(options);

export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error({ err: error, ...context }, error.message);
}
