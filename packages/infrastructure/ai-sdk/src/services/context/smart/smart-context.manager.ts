import { getLogger } from "@ait/core";
import { computeHash } from "@ait/core";
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

  constructor(
    customBudget?: Partial<ContextBudget>,
    dependencies?: {
      tokenizer?: TokenizerService;
      summarizer?: RollingSummarizer;
      budgetManager?: ContextBudgetManager;
      tierManager?: ContextTierManager;
      driftMonitor?: ContextDriftMonitor;
    },
  ) {
    this.budgetManager = dependencies?.budgetManager ?? new ContextBudgetManager();
    if (customBudget) {
      this.budgetManager.updateBudget(customBudget);
    }
    this.tierManager = dependencies?.tierManager ?? new ContextTierManager();
    this.driftMonitor = dependencies?.driftMonitor ?? new ContextDriftMonitor();
    this.tokenizer = dependencies?.tokenizer ?? getTokenizer();
    this.summarizer = dependencies?.summarizer ?? new RollingSummarizer();
  }

  public async assembleContext(request: {
    systemInstructions: string;
    retrievedDocs?: Document[];
  }): Promise<string> {
    logger.info("[SmartContextManager] Assembling context...");

    this.tierManager.reset();
    this._populateTiers(request);

    await this._pruneToBudget();

    const finalContext = this._buildFinalContextString();

    logger.info(`[SmartContextManager] Context assembled. Length: ${finalContext.length} chars.`);
    return finalContext;
  }

  private _populateTiers(request: { systemInstructions: string; retrievedDocs?: Document[] }): void {
    this.tierManager.addItem({
      id: "system-instructions",
      tier: ContextTier.IMMUTABLE,
      content: request.systemInstructions,
      type: "system",
      tokens: this.tokenizer.countTokens(request.systemInstructions),
      timestamp: Date.now(),
    });

    if (request.retrievedDocs && request.retrievedDocs.length > 0) {
      const seenDocs = new Set<string>();

      request.retrievedDocs.forEach((doc, index) => {
        const id = doc.metadata.id ? String(doc.metadata.id) : null;
        let uniqueKey = id;

        if (!uniqueKey) {
          // If no ID, hash the content to deduplicate identical content chunks
          const hash = computeHash(doc.pageContent);
          uniqueKey = `hash-${hash}`;
        }

        if (seenDocs.has(uniqueKey)) {
          return; // Skip duplicate
        }
        seenDocs.add(uniqueKey);

        const title = (doc.metadata?.title as string) || (doc.metadata?.name as string) || null;
        const source =
          (doc.metadata?.source as string) ||
          (doc.metadata?.url as string) ||
          (doc.metadata?.collection as string) ||
          null;
        const header = title ? `[${title}]` : source ? `Source: ${source}` : null;
        const content = header ? `${header}\n${doc.pageContent}` : doc.pageContent;
        this.tierManager.addItem({
          id: `doc-${uniqueKey}`,
          tier: ContextTier.LONG_TERM_MEMORY,
          content: content,
          type: "document",
          tokens: this.tokenizer.countTokens(content),
          timestamp: Date.now(),
          score: (doc.metadata?.score as number) || 0,
        });
      });
    }
  }

  private async _pruneToBudget(): Promise<void> {
    const totalLimit = this.budgetManager.getTotalTokenLimit();
    let currentUsage = this.tierManager.getTotalTokens();

    const budget = this.budgetManager.getGenericBudget();
    const tier4Items = this.tierManager.getItems(ContextTier.LONG_TERM_MEMORY);
    const ragUsageCurrent = this.tierManager.getTierUsage(ContextTier.LONG_TERM_MEMORY);
    const ragBudget = budget.ragTokenLimit ?? Math.floor(totalLimit * 0.6);

    if (currentUsage > totalLimit || ragUsageCurrent > ragBudget) {
      if (tier4Items.length > 0) {
        tier4Items.sort((a, b) => (b.score || 0) - (a.score || 0));

        const keptTier4: ContextItem[] = [];
        const droppedTier4: ContextItem[] = [];

        let ragUsage = 0;

        for (const item of tier4Items) {
          if (ragUsage + item.tokens <= ragBudget) {
            keptTier4.push(item);
            ragUsage += item.tokens;
          } else {
            droppedTier4.push(item);
          }
        }

        if (droppedTier4.length > 0) {
          this.driftMonitor.logDrop(ContextTier.LONG_TERM_MEMORY, droppedTier4);
          logger.debug(`Pruned ${droppedTier4.length} RAG documents to fit budget.`);
        }
        this.tierManager.setItems(ContextTier.LONG_TERM_MEMORY, keptTier4);

        currentUsage = this.tierManager.getTotalTokens();
      }
    }

    if (currentUsage > totalLimit) {
      const tier2Items = this.tierManager.getItems(ContextTier.WORKING_SET);
      // Sort: Newest first (we want to keep newest)
      tier2Items.sort((a, b) => b.timestamp - a.timestamp);

      const keptTier2: ContextItem[] = [];
      const droppedTier2: ContextItem[] = [];

      const otherTiersUsage = currentUsage - tier2Items.reduce((sum, i) => sum + i.tokens, 0);
      const historyBudget = totalLimit - otherTiersUsage;

      let historyUsage = 0;

      for (const item of tier2Items) {
        if (historyBudget > 0 && historyUsage + item.tokens <= historyBudget) {
          keptTier2.push(item);
          historyUsage += item.tokens;
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
