import { type ICacheProvider, setCacheProvider } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import { Redis } from "ioredis";

const logger = getLogger();

export class RedisCacheProvider implements ICacheProvider {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    this.redis.on("error", (err: any) => logger.error("Redis Client Error:", { error: err }));
    this.redis.on("connect", () => logger.info("Redis Client Connected"));
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttlMs) {
      await this.redis.set(key, data, "PX", ttlMs);
    } else {
      await this.redis.set(key, data);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    await this.redis.flushdb();
  }

  getRedisClient(): Redis {
    return this.redis;
  }
}

let _redisProvider: RedisCacheProvider | null = null;

export function initializeCacheProvider(redisUrl?: string): void {
  if (redisUrl) {
    try {
      logger.info("Initializing Redis Cache Provider...");
      const redisProvider = new RedisCacheProvider(redisUrl);
      _redisProvider = redisProvider;
      setCacheProvider(redisProvider);
      logger.info("Redis Cache Provider initialized successfully");
    } catch (error) {
      logger.warn("Failed to initialize Redis Cache Provider, falling back to Memory Cache:", { error });
    }
  } else {
    logger.warn("REDIS_URL not provided, using Memory Cache for ai-sdk");
  }
}

export function getRedisClient(): Redis | null {
  return _redisProvider?.getRedisClient() || null;
}
