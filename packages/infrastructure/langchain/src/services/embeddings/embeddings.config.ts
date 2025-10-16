import { z } from "zod";

/**
 * Schema for embeddings configuration validation
 */
export const embeddingsConfigSchema = z.object({
  // Model configuration
  model: z.string(),
  expectedVectorSize: z.number().positive(),

  // Chunking configuration
  chunkSize: z.number().positive().default(4096),
  chunkOverlap: z.number().nonnegative().default(200),
  concurrencyLimit: z.number().positive().default(1),
  weightChunks: z.boolean().default(false),

  // Text preprocessing configuration
  normalizeText: z.boolean().default(true),
  preserveSentences: z.boolean().default(true),
  maxRetries: z.number().nonnegative().default(3),
  retryDelayMs: z.number().nonnegative().default(1000),
});

export type EmbeddingsConfig = z.infer<typeof embeddingsConfigSchema>;

/**
 * Default configuration values for the embeddings service
 */
export const defaultEmbeddingsConfig: EmbeddingsConfig = {
  model: process.env.EMBEDDINGS_MODEL || "qwen3-embedding:latest",
  expectedVectorSize: Number.parseInt(process.env.EMBEDDINGS_VECTOR_SIZE || "4096", 10),
  chunkSize: Number.parseInt(process.env.EMBEDDINGS_CHUNK_SIZE || "4096", 10),
  chunkOverlap: Number.parseInt(process.env.EMBEDDINGS_CHUNK_OVERLAP || "200", 10),
  concurrencyLimit: Number.parseInt(process.env.EMBEDDINGS_CONCURRENCY_LIMIT || "1", 10),
  weightChunks: process.env.EMBEDDINGS_WEIGHT_CHUNKS === "true",
  normalizeText: process.env.EMBEDDINGS_NORMALIZE_TEXT !== "false",
  preserveSentences: process.env.EMBEDDINGS_PRESERVE_SENTENCES !== "false",
  maxRetries: Number.parseInt(process.env.EMBEDDINGS_MAX_RETRIES || "3", 10),
  retryDelayMs: Number.parseInt(process.env.EMBEDDINGS_RETRY_DELAY_MS || "1000", 10),
};

/**
 * Creates a validated embeddings configuration by merging defaults with provided options
 */
export function createEmbeddingsConfig(options?: Partial<EmbeddingsConfig>): EmbeddingsConfig {
  const mergedConfig = {
    ...defaultEmbeddingsConfig,
    ...options,
  };

  console.log("🔍 Merged config:", mergedConfig);

  return embeddingsConfigSchema.parse(mergedConfig);
}
