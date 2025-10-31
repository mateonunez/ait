export type LoggerMeta = Record<string, unknown> & { correlationId?: string };

export interface Logger {
  info(message: string, meta?: LoggerMeta): void;
  warn(message: string, meta?: LoggerMeta): void;
  error(message: string, meta?: LoggerMeta): void;
  debug(message: string, meta?: LoggerMeta): void;
}

function formatMeta(meta?: LoggerMeta): Record<string, unknown> | undefined {
  if (!meta || Object.keys(meta).length === 0) return undefined;
  return meta;
}

const defaultLogger: Logger = {
  info: (message, meta) => console.info(message, formatMeta(meta)),
  warn: (message, meta) => console.warn(message, formatMeta(meta)),
  error: (message, meta) => console.error(message, formatMeta(meta)),
  debug: (message, meta) => console.debug(message, formatMeta(meta)),
};

let currentLogger: Logger = defaultLogger;

export function setLogger(logger: Logger): void {
  currentLogger = logger;
}

export function getLogger(): Logger {
  return currentLogger;
}

export function generateCorrelationId(): string {
  // Lightweight CID generator without external deps
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase();
}
