import { getAItClient } from "../../client/ai-sdk.client";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";

export interface IHyDEService {
  generateHyDEEmbedding(query: string): Promise<number[]>;
}

export class HyDEService implements IHyDEService {
  private readonly _embeddingsService: IEmbeddingsService;

  constructor(embeddingsService: IEmbeddingsService) {
    this._embeddingsService = embeddingsService;
  }

  async generateHyDEEmbedding(query: string): Promise<number[]> {
    const client = getAItClient();

    const { text: hypotheticalAnswer } = await client.generateText({
      prompt: `Write a concise, factual answer to this question. Focus on key concepts without mentioning specific brands or service names:\n\n${query}\n\nAnswer:`,
      temperature: 0.7,
    });

    const [queryEmbedding, hypoEmbedding] = await Promise.all([
      this._embeddingsService.generateEmbeddings(query),
      this._embeddingsService.generateEmbeddings(hypotheticalAnswer),
    ]);

    const hydeVector = queryEmbedding.map((v, i) => (v + hypoEmbedding[i]) / 2);

    console.debug("HyDE embedding generated", {
      queryLength: query.length,
      hypoLength: hypotheticalAnswer.length,
      hypoPreview: hypotheticalAnswer.slice(0, 100),
    });

    return hydeVector;
  }
}
