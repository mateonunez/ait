import { getLogger } from "@ait/core";
import { type AItClient, getAItClient } from "../../client/ai-sdk.client";

const logger = getLogger();

export class HyDEService {
  private readonly _client: AItClient;

  constructor(client?: AItClient) {
    this._client = client || getAItClient();
  }

  async generateHypotheticalDocument(query: string): Promise<string> {
    const prompt = `Please write a passage to answer the question below. Do not include the question in your response.
Question: ${query}
Passage:`;

    try {
      const response = await this._client.generateText({
        prompt,
        temperature: 0.7, // Higher creativity for hallucinating an answer
      });

      const hypotheticalDoc = response.text.trim();
      logger.debug("Generated HyDE document", { query, hypotheticalDocLength: hypotheticalDoc.length });
      return hypotheticalDoc;
    } catch (error) {
      logger.warn("Failed to generate HyDE document", { error });
      return query; // Fallback to original query
    }
  }
}

let _hydeService: HyDEService | null = null;

export function getHyDEService(): HyDEService {
  if (!_hydeService) {
    _hydeService = new HyDEService();
  }
  return _hydeService;
}
