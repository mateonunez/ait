import { getLogger } from "@ait/core";
import type { ContextItem } from "./context.types";

const logger = getLogger();

export interface IContextSummarizer {
  summarize(items: ContextItem[]): Promise<string>;
}

export class RollingSummarizer implements IContextSummarizer {
  constructor(
    private readonly promptContext: string = "Summarize the following conversation tokens into a concise list of facts, decisions, and open questions.",
  ) {}

  public async summarize(items: ContextItem[]): Promise<string> {
    if (items.length === 0) return "";

    // In a real implementation, this would call an LLM.
    // For now, we'll just concatenate titles/content as a placeholder
    // or return a mock summary.

    // TODO: Integrate actual LLM call here using the SDK's existing capabilities
    // But since this IS the SDK, we need to be careful about circular deps or just
    // use a simple heuristic for now.

    logger.info(`[RollingSummarizer] Mock summarizing ${items.length} items`);

    const summaryLines = items.map((item) => {
      const contentPreview = item.content.length > 50 ? `${item.content.slice(0, 50)}...` : item.content;
      return `- ${item.type} (${item.id}): ${contentPreview}`;
    });

    return `Summary of ${items.length} items:\n${summaryLines.join("\n")}`;
  }
}
