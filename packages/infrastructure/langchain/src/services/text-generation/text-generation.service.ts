import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getLangChainClient, DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";

export const MAX_SEARCH_SIMILAR_DOCS = 100;

export class TextGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextGenerationError";
  }
}

interface Document {
  pageContent: string;
  metadata?: Record<string, unknown>;
}

export interface ITextGenerationService {
  generateText(prompt: string): Promise<string>;
  generateTextStream(prompt: string): AsyncGenerator<string>;
}

export class TextGenerationService implements ITextGenerationService {
  private readonly embeddingService: IEmbeddingsService;
  private readonly maxSearchSimilarDocs = MAX_SEARCH_SIMILAR_DOCS;

  constructor(
    private readonly _model: string = DEFAULT_LANGCHAIN_MODEL,
    private readonly _expectedVectorSize: number = LANGCHAIN_VECTOR_SIZE,
    private readonly _collectionName: string = "langchain",
    embeddingService?: IEmbeddingsService,
  ) {
    this.embeddingService = embeddingService ?? new EmbeddingsService(this._model, this._expectedVectorSize);
  }

  /**
   * Generates text in non-streaming mode.
   *
   * @param prompt The user prompt.
   * @returns The generated text.
   */
  public async generateText(prompt: string): Promise<string> {
    if (!prompt || prompt.trim() === "") {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const overallStart = Date.now();
    try {
      const { context, prompt: preparedPrompt } = await this._prepareChainInput(prompt, "text generation");

      // Check if the prepared prompt is empty after processing
      if (!preparedPrompt || preparedPrompt.trim() === "") {
        throw new TextGenerationError("Prompt cannot be empty after preparation");
      }

      console.debug("Context:", context);
      console.debug("Prompt:", preparedPrompt);
      const llm = this._getLLM();
      console.debug("LLM:", llm);
      const promptTemplate = this._getPromptTemplate(preparedPrompt, context);
      console.debug("Prompt template:", promptTemplate);

      // Format the prompt via the template.
      const formattedPrompt = await promptTemplate.format({
        context,
        prompt: preparedPrompt,
      });

      // Optionally, check if formatting produced an empty prompt.
      if (!formattedPrompt || formattedPrompt.trim() === "") {
        throw new TextGenerationError("Formatted prompt cannot be empty");
      }

      console.debug("Formatted prompt:", formattedPrompt);
      console.info("Invoking LLM in non-streaming mode...");
      const generatedText = await llm.invoke(formattedPrompt);
      console.info(`Text generation completed in ${Date.now() - overallStart}ms`);
      console.debug("Generated text:", generatedText);

      return generatedText;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Text generation failed", { error: errMsg, prompt });
      throw new TextGenerationError(`Failed to generate text: ${errMsg}`);
    }
  }

  /**
   * Generates text in streaming mode.
   * Returns an async iterator that yields text chunks as they are produced.
   *
   * @param prompt The user prompt.
   * @returns An async generator yielding text chunks.
   */
  public async *generateTextStream(prompt: string): AsyncGenerator<string> {
    if (!prompt || prompt.trim() === "") {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const overallStart = Date.now();
    try {
      console.log("Starting stream text generation for prompt:", prompt);

      const { context, prompt: preparedPrompt } = await this._prepareChainInput(prompt, "stream text generation");

      // Check if the prepared prompt is empty after processing
      if (!preparedPrompt || preparedPrompt.trim() === "") {
        throw new TextGenerationError("Prompt cannot be empty after preparation");
      }

      const llm = this._getLLM();
      const promptTemplate = this._getPromptTemplate(preparedPrompt, context);
      const formattedPrompt = await promptTemplate.format({
        context,
        prompt: preparedPrompt,
      });

      if (!formattedPrompt || formattedPrompt.trim() === "") {
        throw new TextGenerationError("Formatted prompt cannot be empty");
      }

      console.debug("Formatted prompt for streaming:", formattedPrompt);
      console.info("Invoking LLM in streaming mode...");
      const stream = await llm.stream(formattedPrompt);

      for await (const chunk of stream) {
        yield chunk;
      }

      console.info(`Stream text generation completed in ${Date.now() - overallStart}ms`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(error);
      throw new TextGenerationError(`Failed to generate stream text: ${errMsg}`);
    }
  }

  /**
   * Builds a prompt template using a system message with context and a user message.
   *
   * @param prompt The original user prompt.
   * @param context The context built from similar documents.
   * @returns A ChatPromptTemplate instance.
   */
  private _getPromptTemplate(prompt: string, context: string): ChatPromptTemplate {
    const systemMessage = `
You are a specialized data interpreter assistant with access to a structured knowledge base.
CONTEXT FORMAT:
Data is stored in JSON format with escaped characters and includes various metadata.
INSTRUCTIONS:
1. Analyze each JSON entry, identify fields and values, and handle escaped characters.
2. Extract only relevant information based on the query, preserving data integrity.
3. Present the information clearly and in a structured format.
4. If data is missing, respond with: "Based on the provided context, I cannot find information about [topic]."
Remember: Use only the data from the CONTEXT without inferring or generating missing information.
CONTEXT:
${context}
    `;
    return ChatPromptTemplate.fromMessages([
      ["system", systemMessage.trim()],
      ["user", prompt],
    ]);
  }

  /**
   * Constructs a context string by joining valid documents.
   *
   * @param documents An array of documents from the similarity search.
   * @returns A single string representing the context.
   */
  private _buildContextFromDocuments(documents: Document[]): string {
    const validDocs = documents.filter((doc) => doc?.pageContent?.trim().length);
    if (validDocs.length === 0) {
      console.warn("No valid documents found for context building");
      return "";
    }
    // Rename the document
    return validDocs
      .map(
        (doc, index) =>
          `## ${doc.metadata?.__type} ${index + 1}\n-------------\nContent:\n${doc.pageContent.trim()}\n-------------\n`,
      )
      .join("\n\n");
  }

  /**
   * Returns an LLM instance from the shared LangChain client.
   */
  private _getLLM() {
    const langChainClient = getLangChainClient();
    return langChainClient.createLLM(this._model);
  }

  /**
   * Prepares the common input for both streaming and non-streaming flows:
   * - Validates the prompt.
   * - Generates embeddings.
   * - Loads the vector store and performs a similarity search.
   * - Builds the context from similar documents.
   *
   * @param prompt A user prompt.
   * @param operation A label for logging purposes.
   * @returns An object containing the original prompt and the built context.
   * @throws TextGenerationError if the prompt is empty.
   */
  private async _prepareChainInput(prompt: string, operation: string): Promise<{ context: string; prompt: string }> {
    if (!prompt?.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }
    console.info(`Starting ${operation} (prompt preview: "${prompt.slice(0, 50)}...")`);

    const embedStart = Date.now();
    const promptEmbeddings = await this.embeddingService.generateEmbeddings(prompt);
    console.debug(`Prompt embeddings generated in ${Date.now() - embedStart}ms`);

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      {
        embedQuery: async () => promptEmbeddings,
        embedDocuments: async (documents: string[]) =>
          Promise.all(documents.map((doc) => this.embeddingService.generateEmbeddings(doc))),
      },
      {
        url: process.env.QDRANT_URL,
        collectionName: this._collectionName,
      },
    );
    console.debug("Vector store loaded");

    const similarityStart = Date.now();
    const similarDocs = await vectorStore.similaritySearch(prompt, this.maxSearchSimilarDocs);
    console.info(`Found ${similarDocs.length} similar documents in ${Date.now() - similarityStart}ms`);

    const context = this._buildContextFromDocuments(similarDocs);
    console.debug(`Context length: ${context.length}`);
    console.debug(`Context preview: ${context.slice(0, 100)}...`);

    return { context, prompt };
  }
}
