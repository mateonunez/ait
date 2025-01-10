import { getLangChainClient } from "../../langchain.client";
import { EmbeddingsService, type IEmbeddingsService } from "../embeddings/embeddings.service";

export class TextGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextGenerationError";
  }
}

export interface ITextGenerationService {
  generateText(prompt: string): Promise<string>;
}

export class TextGenerationService implements ITextGenerationService {
  private readonly _embeddingsService: IEmbeddingsService;

  constructor(
    private readonly _model = "gemma:2b",
    private readonly _expectedVectorSize = 2048,
  ) {
    this._embeddingsService = new EmbeddingsService(this._model, this._expectedVectorSize);
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const langChainClient = getLangChainClient();
      const llm = langChainClient.createLLM(this._model);
      const generatedText = await llm.invoke(prompt);

      console.log(`Generated Langchain text for prompt "${prompt}":`, generatedText);
      return generatedText;
    } catch (error: any) {
      const errorMessage = `Failed to generate text: ${error.message}`;
      console.error(errorMessage);
      throw new TextGenerationError(errorMessage);
    }
  }
}
