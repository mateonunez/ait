import { getLangChainClient } from "../../langchain.client";

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
  private _model: string;

  constructor(model = "gemma:2b", private _expectedVectorSize = 2048) {
    this._model = model;
  }

  async generateText(prompt: string): Promise<string> {
    try {
      if (!prompt?.trim()) {
        throw new TextGenerationError("Prompt cannot be empty");
      }

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
