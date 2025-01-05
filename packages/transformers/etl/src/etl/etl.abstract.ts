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
  protected abstract transform(data: unknown[]): Promise<unknown[]>;
  protected abstract load(data: unknown[]): Promise<void>;

  protected async retry<T>(operation: () => Promise<T>, attempt = 0): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.retryOptions.maxRetries) {
        throw error;
      }
      const delay = Math.min(
        this.retryOptions.initialDelay * 2 ** attempt,
        this.retryOptions.maxDelay
      );
      console.log(`Retry ${attempt + 1}/${this.retryOptions.maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retry(operation, attempt + 1);
    }
  }
}
