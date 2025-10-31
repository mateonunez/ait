import {
  type EmbeddingModelName,
  EmbeddingModels,
  type GenerationModelName,
  GenerationModels,
} from "../../config/models.config";
import type { CostBreakdown } from "./types";

/**
 * Cost configuration for different models
 */
interface ModelCosts {
  generationCostPer1KTokens: number;
  embeddingCostPer1KTokens: number;
  currency: string;
}

/**
 * Default cost structure (can be overridden)
 * Based on typical cloud LLM pricing
 */
const DEFAULT_COSTS: Record<GenerationModelName | EmbeddingModelName, ModelCosts> = {
  // Open-source models - Pricing based on typical cloud provider rates
  // Note: These are open-source models that can be self-hosted for free
  // Costs reflect typical cloud API pricing (Together AI, Replicate, etc.)
  "gpt-oss:20b": {
    generationCostPer1KTokens: 0.0003, // ~$0.30 per 1M tokens (typical for 20B models)
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "gpt-oss:20b-cloud": {
    generationCostPer1KTokens: 0.0003,
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "qwen3:latest": {
    generationCostPer1KTokens: 0.0002, // ~$0.20 per 1M tokens
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "deepseek-r1:latest": {
    generationCostPer1KTokens: 0.00014, // ~$0.14 per 1M tokens (input) via DeepSeek API
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "gemma3:latest": {
    generationCostPer1KTokens: 0.0001, // ~$0.10 per 1M tokens (Google's pricing)
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "granite4:latest": {
    generationCostPer1KTokens: 0.0002, // ~$0.20 per 1M tokens (IBM model)
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  // Embedding Models
  "mxbai-embed-large:latest": {
    generationCostPer1KTokens: 0.0,
    embeddingCostPer1KTokens: 0.00001, // ~$0.01 per 1M tokens (typical embedding cost)
    currency: "USD",
  },
  "qwen3-embedding:latest": {
    generationCostPer1KTokens: 0.0,
    embeddingCostPer1KTokens: 0.000007, // ~$0.007 per 1M tokens
    currency: "USD",
  },
  "bge-m3:latest": {
    generationCostPer1KTokens: 0.0,
    embeddingCostPer1KTokens: 0.00001, // ~$0.01 per 1M tokens
    currency: "USD",
  },
};

/**
 * Service for tracking and calculating costs
 */
export class CostTrackingService {
  private totalGenerationTokens = 0;
  private totalEmbeddingTokens = 0;
  private modelCosts: Record<string, ModelCosts>;

  constructor(customCosts?: Record<string, ModelCosts>) {
    this.modelCosts = { ...DEFAULT_COSTS, ...customCosts };
  }

  /**
   * Record generation tokens used
   */
  recordGeneration(tokens: number, model: string): number {
    this.totalGenerationTokens += tokens;

    const costs = this.modelCosts[model] || DEFAULT_COSTS["gpt-oss:20b"]!;
    return (tokens / 1000) * costs.generationCostPer1KTokens;
  }

  /**
   * Record embedding tokens used
   */
  recordEmbedding(tokens: number, model: string): number {
    this.totalEmbeddingTokens += tokens;

    const costs = this.modelCosts[model] || DEFAULT_COSTS[EmbeddingModels.MXBAI_EMBED_LARGE]!;
    return (tokens / 1000) * costs.embeddingCostPer1KTokens;
  }

  /**
   * Estimate tokens from text (rough approximation)
   * More accurate: use tiktoken library
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate total cost
   */
  getTotalCost(generationModel = "gpt-oss:20b", embeddingModel = "mxbai-embed-large"): CostBreakdown {
    const genCosts = this.modelCosts[generationModel] || DEFAULT_COSTS[GenerationModels.GPT_OSS_20B]!;
    const embCosts = this.modelCosts[embeddingModel] || DEFAULT_COSTS[EmbeddingModels.MXBAI_EMBED_LARGE]!;

    const generationCost = (this.totalGenerationTokens / 1000) * genCosts.generationCostPer1KTokens;
    const embeddingCost = (this.totalEmbeddingTokens / 1000) * embCosts.embeddingCostPer1KTokens;

    return {
      generationCost,
      embeddingCost,
      totalCost: generationCost + embeddingCost,
      generationTokens: this.totalGenerationTokens,
      embeddingTokens: this.totalEmbeddingTokens,
      currency: genCosts.currency,
    };
  }

  /**
   * Get generation tokens count
   */
  getGenerationTokens(): number {
    return this.totalGenerationTokens;
  }

  /**
   * Get embedding tokens count
   */
  getEmbeddingTokens(): number {
    return this.totalEmbeddingTokens;
  }

  /**
   * Reset all counters
   */
  reset(): void {
    this.totalGenerationTokens = 0;
    this.totalEmbeddingTokens = 0;
  }

  /**
   * Set custom model costs
   */
  setModelCosts(model: string, costs: ModelCosts): void {
    this.modelCosts[model] = costs;
  }

  /**
   * Get cost for a specific number of tokens
   */
  calculateCost(tokens: number, model: string, type: "generation" | "embedding"): number {
    const costs = this.modelCosts[model];
    if (!costs) return 0;

    const costPer1K = type === "generation" ? costs.generationCostPer1KTokens : costs.embeddingCostPer1KTokens;
    return (tokens / 1000) * costPer1K;
  }
}

// Singleton instance
let _costTrackingService: CostTrackingService | null = null;

export function getCostTrackingService(): CostTrackingService {
  if (!_costTrackingService) {
    _costTrackingService = new CostTrackingService();
  }
  return _costTrackingService;
}
