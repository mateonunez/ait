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
const DEFAULT_COSTS: Record<string, ModelCosts> = {
  "gpt-oss:20b": {
    generationCostPer1KTokens: 0.0, // Self-hosted, no per-token cost
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "mxbai-embed-large": {
    generationCostPer1KTokens: 0.0,
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  // Cloud models (examples)
  "gpt-4": {
    generationCostPer1KTokens: 0.03,
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "gpt-3.5-turbo": {
    generationCostPer1KTokens: 0.002,
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
  "text-embedding-ada-002": {
    generationCostPer1KTokens: 0.0,
    embeddingCostPer1KTokens: 0.0001,
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

    const costs = this.modelCosts[model] || DEFAULT_COSTS["gpt-oss:20b"];
    return (tokens / 1000) * costs.generationCostPer1KTokens;
  }

  /**
   * Record embedding tokens used
   */
  recordEmbedding(tokens: number, model: string): number {
    this.totalEmbeddingTokens += tokens;

    const costs = this.modelCosts[model] || DEFAULT_COSTS["mxbai-embed-large"];
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
    const genCosts = this.modelCosts[generationModel] || DEFAULT_COSTS["gpt-oss:20b"];
    const embCosts = this.modelCosts[embeddingModel] || DEFAULT_COSTS["mxbai-embed-large"];

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
