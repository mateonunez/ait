import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";

/**
 * Responsible for reading environment variables.
 */
dotenv.config();
const qdrantUrl = process.env.QDRANT_URL;
if (!qdrantUrl) {
  throw new Error("❌ QDRANT_URL is not set in the environment");
}

/**
 * Configuration interface for Qdrant.
 */
export interface IQdrantConfig {
  url: string;
  timeout?: number;
}

/**
 * Creates a new QdrantClient instance from given config.
 */
function buildQdrantClient(config: IQdrantConfig): QdrantClient {
  return new QdrantClient({
    url: config.url,
    timeout: config.timeout ?? 60000
  });
}

/**
 * Module to provide a singleton Qdrant client.
 */
let _instance: QdrantClient | null = null;
let _config: IQdrantConfig = {
  url: qdrantUrl,
  timeout: 60000,
};

/**
 * Allows overriding default config, e.g. in tests.
 */
export function initQdrantClient(configOverrides: Partial<IQdrantConfig> = {}): void {
  _config = { ..._config, ...configOverrides };
}

/**
 * Returns the shared Qdrant client instance, creating it if necessary.
 */
export function getQdrantClient(): QdrantClient {
  if (!_instance) {
    _instance = buildQdrantClient(_config);
  }
  return _instance;
}
