import { getLogger } from "@ait/core";
import type { ContextItem, ContextTier } from "./context.types";

const logger = getLogger();

export interface DriftEvent {
  timestamp: number;
  type: "drop" | "summary_replacing";
  tier: ContextTier;
  itemIds: string[];
  description: string;
}

export class ContextDriftMonitor {
  private events: DriftEvent[] = [];

  public logDrop(tier: ContextTier, items: ContextItem[]): void {
    if (items.length === 0) return;

    const event: DriftEvent = {
      timestamp: Date.now(),
      type: "drop",
      tier,
      itemIds: items.map((i) => i.id),
      description: `Dropped ${items.length} items from Tier ${tier} to fit budget.`,
    };

    this.events.push(event);
    logger.warn(`[ContextDrift] ${event.description} IDs: ${event.itemIds.join(", ")}`);
  }

  public logSummary(tier: ContextTier, originalItems: ContextItem[], summaryItem: ContextItem): void {
    const event: DriftEvent = {
      timestamp: Date.now(),
      type: "summary_replacing",
      tier,
      itemIds: originalItems.map((i) => i.id),
      description: `Summarized ${originalItems.length} items from Tier ${tier} into Summary ${summaryItem.id}`,
    };
    this.events.push(event);
    logger.info(`[ContextDrift] ${event.description}`);
  }

  public getEvents(): DriftEvent[] {
    return this.events;
  }
}
