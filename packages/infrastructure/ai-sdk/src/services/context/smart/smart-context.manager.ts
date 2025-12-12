import { getLogger } from "@ait/core";
import type { Document } from "../../../types/documents";
import { ContextBudgetManager } from "./budget.manager";
import { type ContextBudget, type ContextItem, ContextTier, type IContextManager } from "./context.types";
import { ContextDriftMonitor } from "./drift.monitor";
import { ContextTierManager } from "./tier.manager";

const logger = getLogger();

export class SmartContextManager implements IContextManager {
  private budgetManager: ContextBudgetManager;
  private tierManager: ContextTierManager;
  private driftMonitor: ContextDriftMonitor;

  constructor(customBudget?: Partial<ContextBudget>) {
    this.budgetManager = new ContextBudgetManager();
    if (customBudget) {
      this.budgetManager.updateBudget(customBudget);
    }
    this.tierManager = new ContextTierManager();
    this.driftMonitor = new ContextDriftMonitor();
  }

  public async assembleContext(request: {
    systemInstructions: string;
    messages: any[]; // Using any for now to avoid coupling with specific message types yet
    retrievedDocs?: Document[];
  }): Promise<string> {
    logger.info("[SmartContextManager] Assembling context...");

    // 1. Reset and Populate Tiers
    this.tierManager.reset();
    this.populateTiers(request);

    // 2. Budget Allocation
    // In reality, we'd query the model's limit or use config

    // 3. Selection & Pruning
    this.pruneToBudget();

    // 4. Summarization (if needed)
    // If Working Set was heavily pruned, we might want to generate a summary of the dropped items
    // and add it to Tier 3. For now, we'll assume the inputs might already contain previous summaries.

    // 5. Build Final String
    const finalContext = this.buildFinalContextString();

    logger.info(`[SmartContextManager] Context assembled. Length: ${finalContext.length} items.`);
    return finalContext;
  }

  private populateTiers(request: { systemInstructions: string; messages: any[]; retrievedDocs?: Document[] }): void {
    // Tier 0: System Instructions
    this.tierManager.addItem({
      id: "system-instructions",
      tier: ContextTier.IMMUTABLE,
      content: request.systemInstructions,
      type: "system",
      tokens: request.systemInstructions.length / 4, // Rough est
      timestamp: Date.now(),
    });

    // Tier 1: Active Task (Placeholder - assume last message is active task for now or specific markers)
    // Future: Extract active task from last message or specialized field

    // Tier 2: Working Set - Use recent messages
    // We'll reverse iterate messages
    request.messages.forEach((msg, index) => {
      const content = typeof msg === "string" ? msg : JSON.stringify(msg);
      this.tierManager.addItem({
        id: `msg-${index}`,
        tier: ContextTier.WORKING_SET,
        content: content,
        type: "message",
        tokens: content.length / 4,
        timestamp: Date.now() - (request.messages.length - index) * 1000,
      });
    });

    // Tier 4: Retrieved Docs
    if (request.retrievedDocs && request.retrievedDocs.length > 0) {
      // Use ContextBuilder to format documents beautifully (XML/etc)
      // We can either format them individually or as a block.
      // For budgeting, individual is better.
      request.retrievedDocs.forEach((doc, index) => {
        // HACK: Use ContextBuilder's private/protected methods or just build simple content?
        // Ideally replace with: this.contextBuilder.formatDocument(doc) if it existed exposed.
        // We will use a simple fallback or reusing buildNaturalContent if accessible.
        // Since it is private, we will just use pageContent for now but wrap it.

        const content = `Source: ${doc.metadata.title || doc.metadata.source || "Unknown"}\n${doc.pageContent}`;

        this.tierManager.addItem({
          id: `doc-${doc.metadata.id || index}`,
          tier: ContextTier.LONG_TERM_MEMORY,
          content: content,
          type: "document",
          tokens: content.length / 4,
          timestamp: Date.now(),
        });
      });
    }
  }

  private pruneToBudget(): void {
    // Very simple top-down pruning for now
    // 1. Check Tier 2 usage
    const tier2Limit = this.budgetManager.getTierLimit(ContextTier.WORKING_SET);
    // const tier2Usage = this.tierManager.getTierUsage(ContextTier.WORKING_SET); // Unused

    const tier2Items = this.tierManager.getItems(ContextTier.WORKING_SET);
    // Sort: Newest first (we want to keep newest)
    tier2Items.sort((a, b) => b.timestamp - a.timestamp);

    const keptTier2: ContextItem[] = [];
    const droppedTier2: ContextItem[] = [];
    let currentAndNextUsage = 0;

    for (const item of tier2Items) {
      if (currentAndNextUsage + item.tokens < tier2Limit) {
        keptTier2.push(item);
        currentAndNextUsage += item.tokens;
      } else {
        droppedTier2.push(item);
      }
    }

    if (droppedTier2.length > 0) {
      this.driftMonitor.logDrop(ContextTier.WORKING_SET, droppedTier2);
    }

    this.tierManager.setItems(ContextTier.WORKING_SET, keptTier2);
  }

  private buildFinalContextString(): string {
    // Sort by timestamp? Or by Tier Logic?
    // usually System -> (Context/RAG) -> History -> Newest

    // Let's rely on standard ordering:
    // Tier 0 (System)
    // Tier 3 (Summaries)
    // Tier 4 (RAG)
    // Tier 2 (History) -- oldest to newest
    // Tier 1 (Active)

    const tier0 = this.tierManager.getItems(ContextTier.IMMUTABLE);
    const tier4 = this.tierManager.getItems(ContextTier.LONG_TERM_MEMORY);
    const tier3 = this.tierManager.getItems(ContextTier.CONDENSED_HISTORY);
    const tier2 = this.tierManager.getItems(ContextTier.WORKING_SET).sort((a, b) => a.timestamp - b.timestamp);

    const sections = [...tier0, ...tier3, ...tier4, ...tier2];

    return sections.map((s) => s.content).join("\n\n");
  }
}
