import { getModelCapabilities } from "../../../config/models.config";
import { type ContextBudget, ContextTier } from "./context.types";

/**
 * Context budget manager with model-aware token limits.
 * Uses getModelCapabilities to determine appropriate context window.
 */
export class ContextBudgetManager {
  private budget: ContextBudget;

  constructor(modelName?: string, customBudget?: Partial<ContextBudget>) {
    const { contextWindow } = getModelCapabilities(modelName);

    // Calculate proportional tier limits based on actual context window
    this.budget = {
      totalTokenLimit: contextWindow,
      reservedTokens: {
        [ContextTier.IMMUTABLE]: Math.min(2000, Math.floor(contextWindow * 0.02)),
        [ContextTier.ACTIVE_TASK]: Math.min(2000, Math.floor(contextWindow * 0.02)),
      },
      tierLimits: {
        [ContextTier.WORKING_SET]: Math.floor(contextWindow * 0.45),
        [ContextTier.CONDENSED_HISTORY]: Math.floor(contextWindow * 0.1),
        [ContextTier.LONG_TERM_MEMORY]: Math.floor(contextWindow * 0.35),
      },
      ...customBudget,
    };
  }

  public updateBudget(newBudget: Partial<ContextBudget>): void {
    this.budget = { ...this.budget, ...newBudget };
  }

  public getTotalTokenLimit(): number {
    return this.budget.totalTokenLimit;
  }

  public canFit(tier: ContextTier, itemTokens: number, currentTierUsage: number): boolean {
    const limit = this.getTierLimit(tier);
    // Tier 0 and 1 are effectively unlimited up to the total budget minus other reserves
    // but in practice we treat them as "must fit".
    if (tier === ContextTier.IMMUTABLE || tier === ContextTier.ACTIVE_TASK) {
      return true; // We assume these MUST fit. Enforced at aggregation time.
    }
    return currentTierUsage + itemTokens <= limit;
  }

  public getTierLimit(tier: ContextTier): number {
    return this.budget.tierLimits[tier] ?? this.budget.totalTokenLimit;
  }

  public calculateAllocations(totalAvailable: number): Record<ContextTier, number> {
    return {
      [ContextTier.IMMUTABLE]: this.budget.reservedTokens[ContextTier.IMMUTABLE] ?? 2000,
      [ContextTier.ACTIVE_TASK]: this.budget.reservedTokens[ContextTier.ACTIVE_TASK] ?? 2000,
      [ContextTier.WORKING_SET]: this.budget.tierLimits[ContextTier.WORKING_SET] ?? totalAvailable * 0.4,
      [ContextTier.CONDENSED_HISTORY]: this.budget.tierLimits[ContextTier.CONDENSED_HISTORY] ?? totalAvailable * 0.1,
      [ContextTier.LONG_TERM_MEMORY]: this.budget.tierLimits[ContextTier.LONG_TERM_MEMORY] ?? totalAvailable * 0.3,
    };
  }
}
