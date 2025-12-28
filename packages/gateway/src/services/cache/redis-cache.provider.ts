import { type ICacheProvider, registerCacheProvider } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import Redis from "ioredis";
import { setCacheProvider } from "./cache.service";

const logger = getLogger();

export interface RedisCacheConfig {
  url?: string;
  ttlMs?: number;
  keyPrefix?: string;
  connectTimeoutMs?: number;
  maxRetries?: number;
}

export class RedisCacheProvider implements ICacheProvider {
  private client: any = null;
  private readonly config: Required<RedisCacheConfig>;
  private connected = false;
  private connecting = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: RedisCacheConfig = {}) {
    this.config = {
      url: config.url ?? process.env.REDIS_URL ?? "redis://localhost:6379",
      ttlMs: config.ttlMs ?? 60 * 60 * 1000,
      keyPrefix: config.keyPrefix ?? "ait:cache:",
      connectTimeoutMs: config.connectTimeoutMs ?? 5000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  private async ensureConnection(): Promise<boolean> {
    if (this.connected) return true;
    if (this.connecting && this.connectionPromise) {
      await this.connectionPromise;
      return this.connected;
    }

    this.connecting = true;
    this.connectionPromise = this.connect();

    try {
      await this.connectionPromise;
      return this.connected;
    } catch {
      return false;
    } finally {
      this.connecting = false;
    }
  }

  private async connect(): Promise<void> {
    try {
      this.client = new Redis(this.config.url, {
        connectTimeout: this.config.connectTimeoutMs,
        maxRetriesPerRequest: null,
        retryStrategy: (times: number) => {
          if (times >= this.config.maxRetries) {
            logger.warn("Redis max retries reached, giving up");
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: true, // We will connect manually
      });

      this.client.on("error", (err: Error) => {
        logger.warn("Redis client error", { error: err.message });
        this.connected = false;
      });

      this.client.on("connect", () => {
        logger.info("Redis connected", { url: this.config.url });
        this.connected = true;
      });

      await this.client.connect();
      this.connected = true;

      logger.info("Redis cache provider initialized");
    } catch (error) {
      logger.warn("Failed to connect to Redis, cache will be disabled", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.connected = false;
    }
  }

  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const isConnected = await this.ensureConnection();
    if (!isConnected || !this.client) {
      return null;
    }

    try {
      const fullKey = this.buildKey(key);
      const data = await this.client.get(fullKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      logger.debug("Redis get failed", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const isConnected = await this.ensureConnection();
    if (!isConnected || !this.client) {
      return;
    }

    try {
      const fullKey = this.buildKey(key);
      const ttl = ttlMs ?? this.config.ttlMs;
      const ttlSeconds = Math.ceil(ttl / 1000);

      // ioredis set with EX argument
      await this.client.set(fullKey, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      logger.debug("Redis set failed", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(key: string): Promise<void> {
    const isConnected = await this.ensureConnection();
    if (!isConnected || !this.client) {
      return;
    }

    try {
      const fullKey = this.buildKey(key);
      await this.client.del(fullKey);
    } catch (error) {
      logger.debug("Redis delete failed", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async clear(): Promise<void> {
    const isConnected = await this.ensureConnection();
    if (!isConnected || !this.client) {
      return;
    }

    try {
      const pattern = `${this.config.keyPrefix}*`;
      let cursor = "0";

      do {
        // ioredis scan returns [cursor, keys]
        const result = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = result[0];
        const keys = result[1];

        if (keys.length > 0) {
          await this.client.del(keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      logger.debug("Redis clear failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.quit();
        this.connected = false;
        logger.info("Redis disconnected");
      } catch (error) {
        logger.debug("Redis disconnect failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export function createRedisCacheProvider(config?: RedisCacheConfig): RedisCacheProvider {
  return new RedisCacheProvider(config);
}

export function initializeCacheProvider(url?: string): void {
  if (url) {
    const provider = createRedisCacheProvider({ url });
    setCacheProvider(provider);
    registerCacheProvider(provider);
    const isConnected = provider.isConnected();
    logger.debug("Redis cache provider is connected: ", { isConnected });
  }
}
