import { type ContextItem, ContextTier } from "./context.types";

export class ContextTierManager {
  private items: Map<ContextTier, ContextItem[]> = new Map();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.items.clear();
    for (const tier in ContextTier) {
      if (typeof tier === "number") {
        this.items.set(tier, []);
      }
    }
  }

  public addItem(item: ContextItem): void {
    const tierItems = this.items.get(item.tier) || [];
    tierItems.push(item);
    this.items.set(item.tier, tierItems);
  }

  public getItems(tier: ContextTier): ContextItem[] {
    return this.items.get(tier) || [];
  }

  public getAllItems(): ContextItem[] {
    const all: ContextItem[] = [];
    // Iterate in order of tiers if we want
    // biome-ignore lint/complexity/noForEach: it's ok
    [
      ContextTier.IMMUTABLE,
      ContextTier.ACTIVE_TASK,
      ContextTier.WORKING_SET,
      ContextTier.CONDENSED_HISTORY,
      ContextTier.LONG_TERM_MEMORY,
    ].forEach((tier) => {
      all.push(...(this.items.get(tier) || []));
    });

    return all;
  }

  public sortItems(): void {
    // biome-ignore lint/complexity/noForEach: it's ok
    this.items.forEach((list) => {
      // Sort by timestamp ascending (Oldest first)
      list.sort((a, b) => a.timestamp - b.timestamp);
    });
  }

  public getTierUsage(tier: ContextTier): number {
    return (this.items.get(tier) || []).reduce((sum, item) => sum + item.tokens, 0);
  }

  public removeOldest(tier: ContextTier): ContextItem | undefined {
    const list = this.items.get(tier);
    if (!list || list.length === 0) return undefined;
    // Assuming list is sorted (Oldest -> Newest)
    // Remove from front
    return list.shift();
  }

  public setItems(tier: ContextTier, items: ContextItem[]): void {
    this.items.set(tier, items);
  }
}
