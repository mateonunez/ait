import { getLogger } from "@ait/core";
import { type AItClient, getAItClient } from "../../../client/ai-sdk.client";
import type { ContextItem } from "./context.types";

const logger = getLogger();

export interface IContextSummarizer {
  summarize(items: ContextItem[]): Promise<string>;
}

export class RollingSummarizer implements IContextSummarizer {
  private readonly _client: AItClient;

  constructor(
    client?: AItClient,
    private readonly promptContext: string = "Summarize the following conversation parts into a concise list of key facts, user decisions, an open questions. discard trivial chitchat.",
  ) {
    this._client = client || getAItClient();
  }

  public async summarize(items: ContextItem[]): Promise<string> {
    if (items.length === 0) return "";

    // Sort by timestamp to keep chronological order in summary
    const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp);

    // Create a text representation
    const textToSummarize = sortedItems.map((item) => `[${item.type.toUpperCase()}] ${item.content}`).join("\n\n");

    try {
      logger.debug(`[RollingSummarizer] Summarizing ${items.length} items (${textToSummarize.length} chars)`);

      const prompt = `${this.promptContext}\n\nCONTENT TO SUMMARIZE:\n${textToSummarize}\n\nSUMMARY:`;

      const response = await this._client.generateText({
        prompt,
        temperature: 0.3,
      });

      return response.text.trim();
    } catch (error) {
      logger.error("Failed to summarize context items", { error });
      // Fallback to simple concatenation of IDs or short preview
      return items.map((i) => `[Dropped ${i.type}] ${i.content.slice(0, 50)}...`).join("\n");
    }
  }
}
