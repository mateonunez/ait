import { type ContextBudget, ContextTier } from "./context.types";

export class ContextBudgetManager {
  private readonly defaultBudget: ContextBudget = {
    totalTokenLimit: 128000,
    reservedTokens: {
      [ContextTier.IMMUTABLE]: 1000,
      [ContextTier.ACTIVE_TASK]: 1000,
    },
    tierLimits: {
      [ContextTier.WORKING_SET]: 60000,
      [ContextTier.CONDENSED_HISTORY]: 10000,
      [ContextTier.LONG_TERM_MEMORY]: 40000,
    },
  };

  constructor(private budget: ContextBudget = { ...this.defaultBudget }) {}

  public updateBudget(newBudget: Partial<ContextBudget>): void {
    this.budget = { ...this.budget, ...newBudget };
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
