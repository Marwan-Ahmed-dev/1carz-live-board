// Centralized logger for 1CARZ LIVE BOARD.
//
// Behavior:
// - debug/info: no-op in production (process.env.NODE_ENV === 'production')
// - warn/error: always logged so we never silently swallow a failure
//
// Usage:
//   import { logger } from '@/lib/logger';
//   logger.warn('[upload] fallback path', err);
//   logger.error('subscription failed', err);
//
// Why this exists:
// - Critical/High batches left ~30 console.* call sites scattered across
//   src/. Standardizing here gives us a single point to attach sinks
//   (Sentry, Logflare, etc.) later without hunting the codebase.

type LogArg = unknown;

interface Logger {
  debug: (...args: LogArg[]) => void;
  info: (...args: LogArg[]) => void;
  warn: (...args: LogArg[]) => void;
  error: (...args: LogArg[]) => void;
}

const isProd = process.env.NODE_ENV === 'production';

export const logger: Logger = {
  debug: (...args) => {
    if (isProd) return;
    // eslint-disable-next-line no-console
    console.debug(...args);
  },
  info: (...args) => {
    if (isProd) return;
    // eslint-disable-next-line no-console
    console.info(...args);
  },
  warn: (...args) => {
    // eslint-disable-next-line no-console
    console.warn(...args);
  },
  error: (...args) => {
    // eslint-disable-next-line no-console
    console.error(...args);
  },
};

export default logger;