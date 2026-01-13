export class AItError extends Error {
  readonly code: string;
  readonly meta?: Record<string, unknown>;

  constructor(code: string, message: string, meta?: Record<string, unknown>, cause?: unknown) {
    super(message);
    this.name = "AItError";
    this.code = code;
    this.meta = meta;
    if (cause) (this as unknown as { cause: unknown }).cause = cause;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return String(error);
}

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
