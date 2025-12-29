import { getLogger } from "@ait/core";
import type { Document } from "../../../types/documents";
import { type TokenizerService, getTokenizer } from "../../tokenizer/tokenizer.service";
import { ContextBudgetManager } from "./budget.manager";
import { type ContextBudget, type ContextItem, ContextTier, type IContextManager } from "./context.types";
import { ContextDriftMonitor } from "./drift.monitor";
import { RollingSummarizer } from "./summarizer.service";
import { ContextTierManager } from "./tier.manager";

const logger = getLogger();

export class SmartContextManager implements IContextManager {
  private budgetManager: ContextBudgetManager;
  private tierManager: ContextTierManager;
  private driftMonitor: ContextDriftMonitor;
  private tokenizer: TokenizerService;
  private summarizer: RollingSummarizer;

  constructor(customBudget?: Partial<ContextBudget>) {
    this.budgetManager = new ContextBudgetManager();
    if (customBudget) {
      this.budgetManager.updateBudget(customBudget);
    }
    this.tierManager = new ContextTierManager();
    this.driftMonitor = new ContextDriftMonitor();
    this.tokenizer = getTokenizer();
    this.summarizer = new RollingSummarizer();
  }

  public async assembleContext(request: {
    systemInstructions: string;
    messages: any[]; // Using any for now to avoid coupling with specific message types yet
    retrievedDocs?: Document[];
  }): Promise<string> {
    logger.info("[SmartContextManager] Assembling context...");

    // 1. Reset and Populate Tiers
    this.tierManager.reset();
    this._populateTiers(request);

    // 2. Budget Allocation
    // In reality, we'd query the model's limit or use config

    // 3. Selection & Pruning
    await this._pruneToBudget();

    // 4. Summarization (Handled inside _pruneToBudget now)

    // 5. Build Final String
    const finalContext = this._buildFinalContextString();

    logger.info(`[SmartContextManager] Context assembled. Length: ${finalContext.length} chars.`);
    return finalContext;
  }

  private _populateTiers(request: { systemInstructions: string; messages: any[]; retrievedDocs?: Document[] }): void {
    // Tier 0: System Instructions
    this.tierManager.addItem({
      id: "system-instructions",
      tier: ContextTier.IMMUTABLE,
      content: request.systemInstructions,
      type: "system",
      tokens: this.tokenizer.countTokens(request.systemInstructions),
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
        type: "slack_message",
        tokens: this.tokenizer.countTokens(content),
        timestamp: Date.now() - (request.messages.length - index) * 1000,
      });
    });

    // Tier 4: Retrieved Docs
    if (request.retrievedDocs && request.retrievedDocs.length > 0) {
      request.retrievedDocs.forEach((doc, index) => {
        const title = (doc.metadata?.title as string) || (doc.metadata?.name as string) || null;
        const source =
          (doc.metadata?.source as string) ||
          (doc.metadata?.url as string) ||
          (doc.metadata?.collection as string) ||
          null;
        const header = title ? `[${title}]` : source ? `Source: ${source}` : null;
        const content = header ? `${header}\n${doc.pageContent}` : doc.pageContent;
        this.tierManager.addItem({
          id: `doc-${doc.metadata.id || index}`,
          tier: ContextTier.LONG_TERM_MEMORY,
          content: content,
          type: "document",
          tokens: this.tokenizer.countTokens(content),
          timestamp: Date.now(),
        });
      });
    }
  }

  private async _pruneToBudget(): Promise<void> {
    // Very simple top-down pruning for now
    // 1. Check Tier 2 usage
    const tier2Limit = this.budgetManager.getTierLimit(ContextTier.WORKING_SET);

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

      // Summarize dropped items into Tier 3
      const summary = await this.summarizer.summarize(droppedTier2);
      if (summary) {
        this.tierManager.addItem({
          id: `summary-${Date.now()}`,
          tier: ContextTier.CONDENSED_HISTORY,
          content: `[Previous Context Summary]: ${summary}`,
          type: "summary",
          tokens: this.tokenizer.countTokens(summary),
          timestamp: Date.now(), // Treat as fresh info
        });
        logger.debug("Added summary of dropped context items to Tier 3");
      }
    }

    this.tierManager.setItems(ContextTier.WORKING_SET, keptTier2);
  }

  private _buildFinalContextString(): string {
    // Tier 0 (System)
    // Tier 3 (Summaries)
    // Tier 4 (RAG)
    // Tier 2 (History) -- oldest to newest
    // Tier 1 (Active)

    const tier0 = this.tierManager.getItems(ContextTier.IMMUTABLE);
    const tier4 = this.tierManager.getItems(ContextTier.LONG_TERM_MEMORY);
    const tier3 = this.tierManager.getItems(ContextTier.CONDENSED_HISTORY).sort((a, b) => a.timestamp - b.timestamp);
    const tier2 = this.tierManager.getItems(ContextTier.WORKING_SET).sort((a, b) => a.timestamp - b.timestamp);

    logger.info("[SmartContextManager] Tiers populated", {
      tier0Count: tier0.length,
      tier0Chars: tier0.reduce((sum, i) => sum + i.content.length, 0),
      tier2Count: tier2.length,
      tier3Count: tier3.length,
      tier4Count: tier4.length,
      tier4Chars: tier4.reduce((sum, i) => sum + i.content.length, 0),
      tier4Previews: tier4.slice(0, 3).map((d) => d.content.slice(0, 100)),
    });

    const sections = [...tier0, ...tier3, ...tier4, ...tier2];

    return sections.map((s) => s.content).join("\n\n");
  }
}
