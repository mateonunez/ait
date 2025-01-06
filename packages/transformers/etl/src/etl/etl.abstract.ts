export interface IETL {
  run(limit: number): Promise<void>;
}

export interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
}

export interface BaseVectorPoint {
  id: number;
  vector: number[];
  payload: Record<string, unknown>;
}

export abstract class AbstractETL implements IETL {
  protected readonly retryOptions: RetryOptions;

  constructor(retryOptions: RetryOptions = { maxRetries: 3, initialDelay: 1000, maxDelay: 5000 }) {
    this.retryOptions = retryOptions;
  }

  public async run(limit: number): Promise<void> {
    try {
      console.log(`Starting ETL process. Limit: ${limit}`);
      await this.ensureCollectionExists();
      const data = await this.extract(limit);
      const transformedData = await this.transform(data);
      await this.load(transformedData);
      console.log("ETL process completed successfully");
    } catch (error) {
      console.error("ETL process failed:", error);
      throw error;
    }
  }

  protected abstract ensureCollectionExists(): Promise<void>;
  protected abstract extract(limit: number): Promise<unknown[]>;
  protected abstract transform<T>(data: T[]): Promise<BaseVectorPoint[]>;
  protected abstract load<T>(data: T[]): Promise<void>;

  protected async retry<T>(operation: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryOptions.maxRetries) {
        throw error;
      }
      // Calculate next delay using exponential backoff with a maximum delay threshold
      // Formula: min(initialDelay * 2^attempt, maxDelay)
      // - min(1000 * 2^1 = 2000ms, 5000ms) = 2000ms
      // - min(1000 * 2^2 = 4000ms, 5000ms) = 4000ms
      // - min(1000 * 2^3 = 8000ms, 5000ms) = 5000ms
      const delay = Math.min(this.retryOptions.initialDelay * 2 ** attempt, this.retryOptions.maxDelay);

      console.log(`Retry ${attempt + 1}/${this.retryOptions.maxRetries} after ${delay}ms`);

      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retry(operation, attempt + 1);
    }
  }
}
