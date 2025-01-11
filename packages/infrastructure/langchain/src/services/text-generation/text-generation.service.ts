import { getLangChainClient, DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";
import { EmbeddingsService, type IEmbeddingsService } from "../embeddings/embeddings.service";
import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
  private _embeddingService: IEmbeddingsService;

  constructor(
    private readonly _model = DEFAULT_LANGCHAIN_MODEL,
    private readonly _expectedVectorSize = LANGCHAIN_VECTOR_SIZE,
    private readonly _collectionName: string = "langchain",
  ) {
    this._embeddingService = new EmbeddingsService(this._model, this._expectedVectorSize);
  }

  async generateText(prompt: string): Promise<string> {
    try {
      if (!prompt?.trim()) {
        throw new TextGenerationError("Prompt cannot be empty");
      }

      const embeddings = await this._embeddingService.generateEmbeddings(prompt);

      // Use existing collection
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        {
          embedQuery: async (query: string) => embeddings,
          embedDocuments: async (documents: string[]) => {
            const embeddings = await Promise.all(
              documents.map((doc) => this._embeddingService.generateEmbeddings(doc)),
            );
            return embeddings;
          },
        },
        {
          url: process.env.QDRANT_URL,
          collectionName: this._collectionName,
        },
      );

      const results = await vectorStore.similaritySearch(prompt, 50);

      const context = results
        .map((doc) => doc.pageContent)
        .filter(Boolean)
        .join("\n\n");

      const langChainClient = getLangChainClient();
      const llm = langChainClient.createLLM(this._model);

      const promptTemplate = this._getPromptTemplate(prompt, context);
      const chain = promptTemplate.pipe(llm);

      const generatedText = await chain.invoke({
        context,
        prompt,
      });

      console.debug("Generated text:", generatedText);

      return generatedText;
    } catch (error: any) {
      const errorMessage = `Failed to generate text: ${error.message}`;
      console.error(errorMessage);
      throw new TextGenerationError(errorMessage);
    }
  }

  private _getPromptTemplate(prompt: string, context: string): ChatPromptTemplate {
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", `You're an expert in ${context}.`],
      ["user", `Answer to: ${prompt}`],
    ]);

    return promptTemplate;
  }
}
