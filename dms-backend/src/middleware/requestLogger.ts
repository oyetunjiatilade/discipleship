import morgan from 'morgan';
import { env } from '../config';

/**
 * HTTP request logger.
 * - Development: colorful, concise 'dev' format
 * - Production: structured 'combined' format (suitable for log aggregation)
 * - Test: disabled
 */
export const requestLogger = (() => {
  if (env.NODE_ENV === 'test') {
    // No-op middleware for test environment
    return morgan('dev', { skip: () => true });
  }

  if (env.NODE_ENV === 'production') {
    return morgan('combined');
  }

  return morgan('dev');
})();
