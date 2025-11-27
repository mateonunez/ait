import { z } from "zod";

import { getEmbeddingModel } from "../../config/models.config";

export const OPTIMAL_CHUNK_SIZE = 1500;
export const OPTIMAL_CHUNK_OVERLAP = 100;

export const embeddingsConfigSchema = z.object({
  model: z.string(),
  expectedVectorSize: z.number().positive(),
  chunkSize: z.number().positive().default(OPTIMAL_CHUNK_SIZE),
  chunkOverlap: z.number().nonnegative().default(OPTIMAL_CHUNK_OVERLAP),
  concurrencyLimit: z.number().positive().default(1),
  weightChunks: z.boolean().default(true),
  normalizeText: z.boolean().default(true),
  preserveSentences: z.boolean().default(true),
  maxRetries: z.number().nonnegative().default(3),
  retryDelayMs: z.number().nonnegative().default(1000),
});

export type EmbeddingsConfig = z.infer<typeof embeddingsConfigSchema>;

const embeddingModelConfig = getEmbeddingModel();

export const defaultEmbeddingsConfig: EmbeddingsConfig = {
  model: embeddingModelConfig.name,
  expectedVectorSize: embeddingModelConfig.vectorSize,
  chunkSize: Number.parseInt(process.env.EMBEDDINGS_CHUNK_SIZE || String(OPTIMAL_CHUNK_SIZE), 10),
  chunkOverlap: Number.parseInt(process.env.EMBEDDINGS_CHUNK_OVERLAP || String(OPTIMAL_CHUNK_OVERLAP), 10),
  concurrencyLimit: Number.parseInt(process.env.EMBEDDINGS_CONCURRENCY_LIMIT || "1", 10),
  weightChunks: process.env.EMBEDDINGS_WEIGHT_CHUNKS !== "false",
  normalizeText: process.env.EMBEDDINGS_NORMALIZE_TEXT !== "false",
  preserveSentences: process.env.EMBEDDINGS_PRESERVE_SENTENCES !== "false",
  maxRetries: Number.parseInt(process.env.EMBEDDINGS_MAX_RETRIES || "3", 10),
  retryDelayMs: Number.parseInt(process.env.EMBEDDINGS_RETRY_DELAY_MS || "1000", 10),
};

export function createEmbeddingsConfig(options?: Partial<EmbeddingsConfig>): EmbeddingsConfig {
  const mergedConfig = {
    ...defaultEmbeddingsConfig,
    ...options,
  };

  return embeddingsConfigSchema.parse(mergedConfig);
}
