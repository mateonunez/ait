import dotenv from "dotenv";
import { Redis, type RedisOptions } from "ioredis";

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

class RedisConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisConnectionError";
  }
}

const defaultRedisUrl = process.env.REDIS_URL;
if (!defaultRedisUrl) {
  throw new RedisConnectionError("❌ REDIS_URL is not set in the environment");
}

export interface IRedisConfig {
  url: string;
  retryStrategy?: boolean;
  maxRetriesPerRequest?: number | null;
  enableReadyCheck?: boolean;
  maxRetries?: number;
  logger?: boolean;
}

function buildRedisClient(config: IRedisConfig): Redis {
  const options: RedisOptions = {
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    enableReadyCheck: config.enableReadyCheck ?? true,
    retryStrategy: config.retryStrategy ? (retries) => Math.min(retries * 50, 2000) : undefined,
  };

  const client = new Redis(config.url, options);

  if (config.logger) {
    client
      .on("error", (err) => console.error("Redis Client Error:", err))
      .on("connect", () => console.log("Redis Client Connected"))
      .on("ready", () => console.log("Redis Client Ready"))
      .on("close", () => console.log("Redis Client Connection Closed"))
      .on("reconnecting", () => console.log("Redis Client Reconnecting..."));
  }

  return client;
}

let _instance: Redis | null = null;
let _config: IRedisConfig = {
  url: defaultRedisUrl,
  retryStrategy: true,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  maxRetries: 3,
  logger: true,
};

export function initRedisClient(configOverrides: Partial<IRedisConfig> = {}): void {
  _config = { ..._config, ...configOverrides };
}

export function getRedisClient(): Redis {
  if (!_instance) {
    _instance = buildRedisClient(_config);

    _instance.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });
  }
  return _instance;
}

export async function closeRedisConnection(): Promise<void> {
  if (_instance) {
    await _instance.quit();
    _instance = null;
    console.log("Redis connection closed");
  }
}
