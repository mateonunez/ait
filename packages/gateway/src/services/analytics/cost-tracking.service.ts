import { type EmbeddingModelName, EmbeddingModels, type GenerationModelName, GenerationModels } from "@ait/ai-sdk";
import { getTokenizer } from "@ait/ai-sdk";
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
  "kimi-k2-thinking:cloud": {
    generationCostPer1KTokens: 0.0003, // ~$0.30 per 1M tokens (cloud-hosted thinking model)
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
  "llava:latest": {
    generationCostPer1KTokens: 0.0,
    embeddingCostPer1KTokens: 0.00001, // ~$0.01 per 1M tokens
    currency: "USD",
  },
  "nemotron-3-nano:30b-cloud": {
    generationCostPer1KTokens: 0.0,
    embeddingCostPer1KTokens: 0.0,
    currency: "USD",
  },
};

export class CostTrackingService {
  private totalGenerationTokens = 0;
  private totalEmbeddingTokens = 0;
  private modelCosts: Record<string, ModelCosts>;

  constructor(customCosts?: Record<string, ModelCosts>) {
    this.modelCosts = { ...DEFAULT_COSTS, ...customCosts };
  }

  recordGeneration(tokens: number, model: string): number {
    this.totalGenerationTokens += tokens;

    const costs = this.modelCosts[model] || DEFAULT_COSTS["gpt-oss:20b"]!;
    return (tokens / 1000) * costs.generationCostPer1KTokens;
  }

  recordEmbedding(tokens: number, model: string): number {
    this.totalEmbeddingTokens += tokens;

    const costs = this.modelCosts[model] || DEFAULT_COSTS[EmbeddingModels.MXBAI_EMBED_LARGE]!;
    return (tokens / 1000) * costs.embeddingCostPer1KTokens;
  }

  estimateTokens(text: string): number {
    return getTokenizer().countTokens(text);
  }

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

  getGenerationTokens(): number {
    return this.totalGenerationTokens;
  }

  getEmbeddingTokens(): number {
    return this.totalEmbeddingTokens;
  }

  reset(): void {
    this.totalGenerationTokens = 0;
    this.totalEmbeddingTokens = 0;
  }

  setModelCosts(model: string, costs: ModelCosts): void {
    this.modelCosts[model] = costs;
  }

  calculateCost(tokens: number, model: string, type: "generation" | "embedding"): number {
    const costs = this.modelCosts[model];
    if (!costs) return 0;

    const costPer1K = type === "generation" ? costs.generationCostPer1KTokens : costs.embeddingCostPer1KTokens;
    return (tokens / 1000) * costPer1K;
  }
}

let _costTrackingService: CostTrackingService | null = null;

export function getCostTrackingService(): CostTrackingService {
  if (!_costTrackingService) {
    _costTrackingService = new CostTrackingService();
  }
  return _costTrackingService;
}
