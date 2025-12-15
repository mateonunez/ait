export type LoggerMeta = Record<string, unknown> & { correlationId?: string };

export interface Logger {
  info(message: string, meta?: LoggerMeta): void;
  warn(message: string, meta?: LoggerMeta): void;
  error(message: string, meta?: LoggerMeta): void;
  debug(message: string, meta?: LoggerMeta): void;
  child(meta: LoggerMeta): Logger;
}

function formatMeta(meta?: LoggerMeta): Record<string, unknown> | undefined {
  if (!meta || Object.keys(meta).length === 0) return undefined;
  return meta;
}

class ConsoleLogger implements Logger {
  constructor(private defaultMeta: LoggerMeta = {}) {}

  private mergeMeta(meta?: LoggerMeta): LoggerMeta | undefined {
    const merged = { ...this.defaultMeta, ...meta };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private logWithMeta(logFn: (...args: unknown[]) => void, message: string, meta?: LoggerMeta): void {
    const formattedMeta = formatMeta(this.mergeMeta(meta));
    if (formattedMeta !== undefined) {
      logFn(message, formattedMeta);
    } else {
      logFn(message);
    }
  }

  log(message: string, meta?: LoggerMeta): void {
    this.logWithMeta(console.log.bind(console), message, meta);
  }

  info(message: string, meta?: LoggerMeta): void {
    this.logWithMeta(console.info.bind(console), message, meta);
  }

  warn(message: string, meta?: LoggerMeta): void {
    this.logWithMeta(console.warn.bind(console), message, meta);
  }

  error(message: string, meta?: LoggerMeta): void {
    this.logWithMeta(console.error.bind(console), message, meta);
  }

  debug(message: string, meta?: LoggerMeta): void {
    this.logWithMeta(console.debug.bind(console), message, meta);
  }

  child(meta: LoggerMeta): Logger {
    return new ConsoleLogger({ ...this.defaultMeta, ...meta });
  }
}

const defaultLogger: Logger = new ConsoleLogger();

let currentLogger: Logger = defaultLogger;

export function setLogger(console: Logger): void {
  currentLogger = console;
}

export function getLogger(): Logger {
  return currentLogger;
}

export function generateCorrelationId(): string {
  // Lightweight CID generator without external deps
  return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).toUpperCase();
}
