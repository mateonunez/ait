import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getLangChainClient, DEFAULT_LANGCHAIN_MODEL, LANGCHAIN_VECTOR_SIZE } from "../../langchain.client";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";

// Optional: Constant for limiting number of similar documents
export const MAX_SEARCH_SIMILAR_DOCS = 100;

/**
 * Custom error to handle text generation failures.
 */
export class TextGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TextGenerationError";
  }
}

/**
 * Defines the structure of a document with page content and optional metadata.
 */
interface Document {
  pageContent: string;
  metadata?: Record<string, unknown>;
}

/**
 * Defines the interface for a text generation service.
 */
export interface ITextGenerationService {
  /**
   * Generates text from a given prompt.
   *
   * @param prompt - The user's prompt or question.
   * @returns The generated text as a string.
   */
  generateText(prompt: string): Promise<string>;
}

/**
 * TextGenerationService is responsible for:
 * 1. Validating and embedding the prompt.
 * 2. Fetching similar context documents from Qdrant.
 * 3. Creating and invoking a prompt chain via LangChain's LLM.
 */
export class TextGenerationService implements ITextGenerationService {
  private readonly _embeddingService: IEmbeddingsService;
  private readonly _maxSearchSimilarDocs = MAX_SEARCH_SIMILAR_DOCS;

  constructor(
    private readonly _model: string = DEFAULT_LANGCHAIN_MODEL,
    private readonly _expectedVectorSize: number = LANGCHAIN_VECTOR_SIZE,
    private readonly _collectionName: string = "langchain",
    embeddingService?: IEmbeddingsService, // <-- optional injection
  ) {
    // If an embeddings service is passed in, use it; otherwise instantiate the real one
    this._embeddingService = embeddingService ?? new EmbeddingsService(this._model, this._expectedVectorSize);
  }

  /**
   * Generates text from a given prompt using a context-aware chain.
   *
   * @param prompt - The user's prompt or question.
   * @returns The generated text as a string.
   * @throws TextGenerationError if prompt is empty or an error occurs.
   */
  public async generateText(prompt: string): Promise<string> {
    try {
      if (!prompt?.trim()) {
        throw new TextGenerationError("Prompt cannot be empty");
      }

      // Generate embeddings for the query prompt (uses either real or mock embeddings service)
      const promptEmbeddings = await this._embeddingService.generateEmbeddings(prompt);

      // Create (or load) a Qdrant vector store referencing an existing collection
      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        {
          embedQuery: async () => promptEmbeddings,
          embedDocuments: async (documents: string[]) => {
            const embeddings = await Promise.all(
              documents.map((doc) => this._embeddingService.generateEmbeddings(doc)),
            );
            return embeddings;
          },
        },
        {
          url: process.env.QDRANT_URL, // Or a fallback if undefined
          collectionName: this._collectionName,
        },
      );

      // Find top-N similar documents to build context
      const similarDocs = await vectorStore.similaritySearch(prompt, this._maxSearchSimilarDocs);

      // Build context from the retrieved documents
      const context = this._buildContextFromDocuments(similarDocs);

      // Confirm length and content for debugging
      console.debug(`Context Length: ${context.length}`);
      console.debug(`Context Preview:\n${JSON.stringify(context).slice(0, 100)}...`);

      // Create an LLM instance and build a chain from the prompt template
      const langChainClient = getLangChainClient();
      const llm = langChainClient.createLLM(this._model);

      // Build our prompt template with system instructions and user message
      const promptTemplate = this._getPromptTemplate(prompt, context);
      const chain = promptTemplate.pipe(llm);

      // Invoke the chain with the context and user prompt
      const generatedText = await chain.invoke({ context, prompt });

      console.debug("Generated text:", generatedText);
      return generatedText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const errorMessage = `Failed to generate text: ${message}`;
      console.error(errorMessage);
      throw new TextGenerationError(errorMessage);
    }
  }

  /**
   * Builds an LLM prompt template with a system and user message.
   *
   * @param prompt - The user's prompt or question.
   * @param context - Relevant context retrieved from similar docs.
   * @returns A ChatPromptTemplate with system and user instructions.
   */
  private _getPromptTemplate(prompt: string, context: string): ChatPromptTemplate {
    // A clearer, more prescriptive system message:
    const systemMessage = `
    You are a specialized assistant with exclusive access to a specific database of information.

    CONTEXT:
    ${context}

    INSTRUCTIONS:
    1. Carefully analyze the provided CONTEXT.
    2. Answer ONLY with information from the CONTEXT; do NOT use outside information.
    3. If the user's question is addressed in the CONTEXT, provide a detailed and accurate response using the exact data where possible.
    4. If the requested information is not found in the CONTEXT, reply with:
       "Based on the provided context, I cannot find information about [requested topic]."
    5. When returning structured data (e.g., repository or track information), format it neatly and clearly.

    ADDITIONAL NOTE: 
    - Pay attention to lines containing repository metadata such as "type:repository", "language:TypeScript", etc.
    - If the user asks for repositories in a certain language, extract and list them from the CONTEXT if they exist.

    Remember: 
    - Restrict your answer to information from the CONTEXT.
    - Do NOT infer or fabricate information that is not explicitly stated.
    - Maintain clarity and precision in your responses.
    `;

    return ChatPromptTemplate.fromMessages<Array<[string, string]>>([
      ["system", systemMessage.trim()],
      ["user", prompt],
      // Prompt the assistant to provide the final answer based on the instructions:
      ["assistant", "Please provide your answer below, strictly following the above instructions."],
    ]);
  }

  /**
   * Safely constructs a context string by joining the 'pageContent' fields of
   * the retrieved documents, separated by double newlines.
   *
   * @param documents - Array of documents from similarity search.
   * @returns A single string containing context from the documents.
   */
  private _buildContextFromDocuments(documents: Document[]): string {
    // Filter out empty documents
    const validDocs = documents.filter((doc) => doc?.pageContent?.trim().length > 0);

    if (!validDocs.length) {
      console.debug("No valid documents found for context building");
      return "";
    }

    // Format documents with metadata
    return validDocs
      .map((doc, index) => {
        const metadata = doc.metadata
          ? Object.entries(doc.metadata)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n  ")
          : "No metadata";

        return [
          `📄 Document ${index + 1}`,
          "-------------------",
          "Metadata:",
          `  ${metadata}`,
          "",
          "Content:",
          doc.pageContent.trim(),
          "-------------------",
        ].join("\n");
      })
      .join("\n\n");
  }
}
