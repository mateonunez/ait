import { AItError, RateLimitError, type RetryOptions, getLogger, requestJson, retryWithBackoff } from "@ait/core";

const logger = getLogger();

export interface RateLimitedHttpClientOptions {
  /** Vendor name for error messages */
  vendor: string;
  /** Base URL for API requests */
  baseUrl: string;
  /** Maximum retry attempts for rate limit errors */
  maxRetries?: number;
  /** Initial delay in ms before first retry */
  initialDelayMs?: number;
  /** Maximum delay in ms between retries */
  maxDelayMs?: number;
  /** Delay between chunked batch requests in ms */
  chunkDelayMs?: number;
}

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  chunkDelayMs: 200,
};

/**
 * A reusable HTTP client with built-in rate limit handling and exponential backoff.
 * Uses the Retry-After header from API responses when available.
 */
export class RateLimitedHttpClient {
  private readonly _vendor: string;
  private readonly _baseUrl: string;
  private readonly _maxRetries: number;
  private readonly _initialDelayMs: number;
  private readonly _maxDelayMs: number;
  private readonly _chunkDelayMs: number;
  private _accessToken: string;

  constructor(accessToken: string, options: RateLimitedHttpClientOptions) {
    this._accessToken = accessToken;
    this._vendor = options.vendor;
    this._baseUrl = options.baseUrl;
    this._maxRetries = options.maxRetries ?? DEFAULT_OPTIONS.maxRetries;
    this._initialDelayMs = options.initialDelayMs ?? DEFAULT_OPTIONS.initialDelayMs;
    this._maxDelayMs = options.maxDelayMs ?? DEFAULT_OPTIONS.maxDelayMs;
    this._chunkDelayMs = options.chunkDelayMs ?? DEFAULT_OPTIONS.chunkDelayMs;
  }

  /**
   * Updates the access token (e.g., after refresh)
   */
  public setAccessToken(token: string): void {
    this._accessToken = token;
  }

  /**
   * Make a rate-limit-aware HTTP request with automatic retries
   */
  public async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: Record<string, unknown>;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const { method = "GET", body, headers = {} } = options;
    const url = `${this._baseUrl}${endpoint}`;

    const retryOptions: RetryOptions = {
      maxAttempts: this._maxRetries,
      initialDelayMs: this._initialDelayMs,
      maxDelayMs: this._maxDelayMs,
      backoffMultiplier: 2,
      shouldRetry: (error: Error, attempt: number) => {
        // Retry on rate limit errors
        if (error instanceof AItError) {
          const isRateLimit = error.code === "HTTP_429" || error.meta?.status === 429;
          if (isRateLimit) {
            const retryAfter = this._getRetryAfterFromError(error);
            logger.warn(
              `[${this._vendor}] Rate limited on attempt ${attempt}/${this._maxRetries}. ` +
                `Retrying in ${retryAfter}ms...`,
            );
            return true;
          }
        }
        return false;
      },
    };

    try {
      return await retryWithBackoff(async () => {
        const result = await requestJson<T>(url, {
          method,
          headers: {
            Authorization: `Bearer ${this._accessToken}`,
            "Content-Type": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!result.ok) {
          throw result.error;
        }

        return result.value.data as unknown as T;
      }, retryOptions);
    } catch (error: unknown) {
      // After all retries exhausted, throw RateLimitError if it was a rate limit
      if (error instanceof AItError) {
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const retryAfter = this._getRetryAfterFromError(error);
          throw new RateLimitError(
            this._vendor,
            Date.now() + retryAfter,
            `${this._vendor} rate limit exceeded after ${this._maxRetries} retries`,
          );
        }
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new AItError("NETWORK", `Network error: ${message}`, undefined, error);
    }
  }

  /**
   * Process items in chunks with delays to avoid burst rate limits.
   * Useful for N+1 API call patterns (e.g., fetching tracks for each playlist).
   */
  public async processInChunks<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: { chunkSize?: number; delayMs?: number } = {},
  ): Promise<R[]> {
    const { chunkSize = 5, delayMs = this._chunkDelayMs } = options;
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      // Process chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          try {
            return await processor(item);
          } catch (error) {
            logger.warn(`[${this._vendor}] Failed to process item in chunk`, {
              error: error instanceof Error ? error.message : String(error),
            });
            return null;
          }
        }),
      );

      results.push(...(chunkResults.filter((r) => r !== null) as R[]));

      // Add delay between chunks to avoid burst rate limits
      if (i + chunkSize < items.length) {
        await this._sleep(delayMs);
      }
    }

    return results;
  }

  private _getRetryAfterFromError(error: AItError): number {
    const headers = (error.meta?.headers as Record<string, string>) || {};
    const retryAfter = headers["retry-after"];
    if (retryAfter) {
      return Number.parseInt(retryAfter, 10) * 1000;
    }
    return this._initialDelayMs;
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
