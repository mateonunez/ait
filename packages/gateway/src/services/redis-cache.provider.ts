import { Redis } from "ioredis";
import { type ICacheProvider, setCacheProvider } from "@ait/ai-sdk";

export class RedisCacheProvider implements ICacheProvider {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    this.redis.on("error", (err: any) => console.error("Redis Client Error:", err));
    this.redis.on("connect", () => console.log("Redis Client Connected"));
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
}

export function initializeCacheProvider(redisUrl?: string): void {
  if (redisUrl) {
    try {
      console.log("Initializing Redis Cache Provider...");
      const redisProvider = new RedisCacheProvider(redisUrl);
      setCacheProvider(redisProvider);
      console.log("Redis Cache Provider initialized successfully");
    } catch (error) {
      console.warn("Failed to initialize Redis Cache Provider, falling back to Memory Cache:", error);
    }
  } else {
    console.warn("REDIS_URL not provided, using Memory Cache for ai-sdk");
  }
}
