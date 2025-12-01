import { getLogger } from "@ait/core";
import dotenv from "dotenv";
import * as drizzleOrm from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const logger = getLogger();

dotenv.config();

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: ".env.test", override: true });
}

const defaultPostgresUrl = process.env.POSTGRES_URL;
if (!defaultPostgresUrl) {
  throw new Error("❌ POSTGRES_URL is not set in the environment");
}

/**
 * Configuration interface for Postgres.
 */
export interface IPostgresConfig {
  url: string;
  max?: number;
  idleTimeout?: number;
  ssl?: boolean;
  logger?: boolean;
}

/**
 * Builds a Postgres + Drizzle instance based on provided config.
 */
function buildPostgresClient(config: IPostgresConfig) {
  const queryClient = postgres(config.url, {
    max: config.max ?? 5,
    idle_timeout: config.idleTimeout ?? 0,
    ssl: config.ssl ?? false,
  });

  const db = drizzle(queryClient, {
    logger: config.logger ?? false,
  });

  return { queryClient, db };
}

// Internal state for the singleton instance
let _instance: ReturnType<typeof buildPostgresClient> | null = null;
let _config: IPostgresConfig = {
  url: defaultPostgresUrl,
  max: 5,
  idleTimeout: 0,
  ssl: false,
  logger: false,
};

/**
 * Allows overriding default config, e.g. in tests.
 */
export function initPostgresClient(configOverrides: Partial<IPostgresConfig> = {}): void {
  _config = { ..._config, ...configOverrides };
}

/**
 * Returns the shared Postgres/Drizzle instance, creating it if necessary.
 */
export function getPostgresClient() {
  if (!_instance) {
    _instance = buildPostgresClient(_config);
  }
  return _instance;
}

/**
 * Gracefully closes the singleton database connection.
 */
export async function closePostgresConnection(): Promise<void> {
  if (_instance) {
    await _instance.queryClient.end({ timeout: 5 });
    _instance = null;
    logger.info("Database connection closed");
  }
}

/**
 * For convenience, export references to Drizzle ORM.
 */
export { drizzleOrm };
