import type { RetryConfig } from "../../types/text-generation";

/**
 * Interface for retry service
 */
export interface IRetryService {
  /**
   * Execute an operation with automatic retries
   * @param operation - Async operation to execute
   * @param context - Optional context for logging
   * @returns Operation result
   */
  execute<T>(operation: () => Promise<T>, context?: string): Promise<T>;
}

/**
 * Service for executing operations with automatic retry logic
 */
export class RetryService implements IRetryService {
  private readonly _maxRetries: number;
  private readonly _delayMs: number;
  private readonly _backoffMultiplier: number;

  constructor(config: RetryConfig = {}) {
    this._maxRetries = Math.max(config.maxRetries ?? 3, 1);
    this._delayMs = Math.max(config.delayMs ?? 1000, 0);
    this._backoffMultiplier = Math.max(config.backoffMultiplier ?? 2, 1);
  }

  async execute<T>(operation: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this._maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === this._maxRetries) {
          break;
        }

        const delay = this._delayMs * this._backoffMultiplier ** (attempt - 1);
        console.warn(`Operation failed, retrying in ${delay}ms`, {
          attempt,
          context,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("Retry operation failed unexpectedly");
  }
}
