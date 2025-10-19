import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();
const qdrantUrl = process.env.QDRANT_URL;
if (!qdrantUrl) {
  throw new Error("❌ QDRANT_URL is not set in the environment");
}

export interface IQdrantConfig {
  url: string;
  timeout?: number;
}

function buildQdrantClient(config: IQdrantConfig): QdrantClient {
  return new QdrantClient({
    url: config.url,
    timeout: config.timeout ?? 60000,
  });
}

let _instance: QdrantClient | null = null;
let _config: IQdrantConfig = {
  url: qdrantUrl,
  timeout: 60000,
};

export function initQdrantClient(configOverrides: Partial<IQdrantConfig> = {}): void {
  _config = { ..._config, ...configOverrides };
}

export function getQdrantClient(): QdrantClient {
  if (!_instance) {
    _instance = buildQdrantClient(_config);
  }
  return _instance;
}

export function resetQdrantClient(): void {
  _instance = null;
}
