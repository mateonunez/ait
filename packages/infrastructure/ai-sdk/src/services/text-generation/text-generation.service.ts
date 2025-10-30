import { getAItClient, DEFAULT_RAG_COLLECTION } from "../../client/ai-sdk.client";
import { QdrantProvider } from "../rag/qdrant.provider";
import { createMultiQueryRetrievalService } from "../rag/multi-query-retrieval.factory";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../prompts/system.prompt";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { convertToOllamaTools } from "../../tools/tool.converter";
import { randomUUID } from "node:crypto";

import { RetryService, type IRetryService } from "./retry.service";
import { ToolExecutionService, type IToolExecutionService } from "./tool-execution.service";
import { PromptBuilderService, type IPromptBuilderService } from "./prompt-builder.service";
import { ContextPreparationService, type IContextPreparationService } from "./context-preparation.service";
import { ConversationManagerService, type IConversationManagerService } from "./conversation-manager.service";

import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import type { ChatMessage } from "../../types/chat";
import type { Tool } from "../../types/tools";
import type { TextGenerationFeatureConfig } from "../../types/config";
import type { RAGContext } from "../../types/text-generation";

export const MAX_SEARCH_SIMILAR_DOCS = 100;

export class TextGenerationError extends Error {
  constructor(
    message: string,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = "TextGenerationError";
  }
}

/**
 * Configuration for Text Generation Service
 * Extends TextGenerationFeatureConfig with service-specific options
 */
export interface TextGenerationConfig extends TextGenerationFeatureConfig {
  /** Generation model name */
  model?: string;
  /** Embeddings model name */
  embeddingsModel?: string;
  /** Vector collection name */
  collectionName?: string;
  /** Custom embeddings service instance */
  embeddingsService?: IEmbeddingsService;
}

export interface GenerateOptions {
  prompt: string;
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  messages?: ChatMessage[];
}

export interface GenerateStreamOptions {
  prompt: string;
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  messages?: ChatMessage[];
}

export interface ITextGenerationService {
  generateStream(options: GenerateStreamOptions): AsyncGenerator<string>;
}

/**
 * Orchestrator service for text generation with RAG, tools, and conversation management
 */
export class TextGenerationService implements ITextGenerationService {
  private readonly _embeddingsModel: string;
  private readonly _collectionName: string;

  // Service dependencies
  private readonly _retryService: IRetryService;
  private readonly _toolExecutionService: IToolExecutionService;
  private readonly _promptBuilderService: IPromptBuilderService;
  private readonly _contextPreparationService: IContextPreparationService;
  private readonly _conversationManagerService: IConversationManagerService;

  // Configuration
  private readonly _enableRAGByDefault: boolean;
  private readonly _maxToolRounds: number;

  constructor(config: TextGenerationConfig = {}) {
    const client = getAItClient();

    this._embeddingsModel = config.embeddingsModel || client.embeddingModelConfig.name;
    this._collectionName = config.collectionName || DEFAULT_RAG_COLLECTION;

    const embeddingService =
      config.embeddingsService ||
      new EmbeddingsService(this._embeddingsModel, client.embeddingModelConfig.vectorSize, { concurrencyLimit: 4 });

    const qdrantProvider = new QdrantProvider({
      collectionName: this._collectionName,
      embeddingsModel: this._embeddingsModel,
      embeddingsService: embeddingService,
    });

    const multiQueryRetrieval = createMultiQueryRetrievalService({
      maxDocs: config.multipleQueryPlannerConfig?.maxDocs || 100,
      queryPlanner: {
        queriesCount: config.multipleQueryPlannerConfig?.queriesCount || 12,
      },
      concurrency: config.multipleQueryPlannerConfig?.concurrency || 4,
    });

    // Initialize services
    this._retryService = new RetryService(config.retryConfig);
    this._toolExecutionService = new ToolExecutionService(config.toolExecutionConfig);
    this._promptBuilderService = new PromptBuilderService();
    this._contextPreparationService = new ContextPreparationService(
      qdrantProvider,
      multiQueryRetrieval,
      embeddingService,
      config.contextPreparationConfig,
    );
    this._conversationManagerService = new ConversationManagerService(config.conversationConfig);

    // Configuration
    this._enableRAGByDefault = config.contextPreparationConfig?.enableRAG ?? true;
    // Default to a single tool round; escalate via options when needed
    this._maxToolRounds = config.toolExecutionConfig?.maxRounds ?? 1;
  }

  public async *generateStream(options: GenerateStreamOptions): AsyncGenerator<string> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const correlationId = randomUUID();
    const overallStart = Date.now();

    try {
      console.info("Starting stream text generation", {
        prompt: options.prompt.slice(0, 100),
        hasMessages: !!options.messages && options.messages.length > 0,
        messageCount: options.messages?.length || 0,
      });

      const client = getAItClient();

      // Process conversation history
      const conversationContext = await this._conversationManagerService.processConversation(
        options.messages,
        options.prompt,
      );

      console.info("Conversation context processed", {
        recentMessageCount: conversationContext.recentMessages.length,
        hasSummary: !!conversationContext.summary,
        estimatedTokens: conversationContext.estimatedTokens,
      });

      // Prepare system message with RAG context if enabled
      const { systemMessage, ragContext } = await this._prepareSystemMessage(options, correlationId);

      if (ragContext?.fallbackUsed) {
        const fallbackResponse = this._buildFallbackResponse(ragContext.fallbackReason);
        console.info("Responding with fallback message", {
          correlationId,
          fallbackReason: ragContext.fallbackReason,
        });
        yield fallbackResponse;
        console.info("Fallback response completed", { correlationId });
        return;
      }

      // Build initial prompt
      let currentPrompt = this._promptBuilderService.buildPrompt({
        systemMessage,
        conversationHistory: this._formatConversationContext(conversationContext),
        userMessage: options.prompt,
      });

      // Tool execution loop
      const ollamaTools = options.tools ? convertToOllamaTools(options.tools) : undefined;
      const maxRounds = options.maxToolRounds || this._maxToolRounds;
      let hasToolCalls = false;

      // Check if model supports tools
      const modelSupportsTools = client.generationModelConfig.supportsTools ?? true;
      if (options.tools && !modelSupportsTools) {
        console.warn(
          `Model '${client.generationModelConfig.name}' does not support tools. Tool execution will be skipped.`,
          {
            model: client.generationModelConfig.name,
            supportsTools: false,
            toolsProvided: Object.keys(options.tools).length,
          },
        );
      }

      for (let round = 0; round < maxRounds; round++) {
        if (!options.tools || !modelSupportsTools) {
          break;
        }

        console.info(`Checking for tool calls (round ${round + 1})...`);

        const messages = this._promptBuilderService.buildMessages(
          systemMessage,
          conversationContext.recentMessages,
          options.prompt,
        );

        const checkResult = await this._retryService.execute(async () => {
          return await client.generateText({
            prompt: currentPrompt,
            messages,
            tools: ollamaTools,
            temperature: client.config.generation.temperature,
            topP: client.config.generation.topP,
            topK: client.config.generation.topK,
          });
        }, "tool-check");

        console.info("Tool check result", {
          hasToolCalls: checkResult.toolCalls && checkResult.toolCalls.length > 0,
          toolCallsCount: checkResult.toolCalls?.length || 0,
        });

        if (checkResult.toolCalls && checkResult.toolCalls.length > 0) {
          hasToolCalls = true;

          const toolResults = await this._toolExecutionService.executeToolCalls(checkResult.toolCalls, options.tools);
          const formattedToolResults = this._toolExecutionService.formatToolResults(toolResults);

          currentPrompt = this._promptBuilderService.buildPrompt({
            systemMessage,
            conversationHistory: this._formatConversationContext(conversationContext),
            userMessage: options.prompt,
            toolResults: formattedToolResults,
          });

          console.info("Streaming response with tool results...");
          break;
        }
      }

      // Generate streaming response
      const stream = await this._retryService.execute(async () => {
        return client.streamText({
          prompt: currentPrompt,
          temperature: client.config.generation.temperature,
          topP: client.config.generation.topP,
          topK: client.config.generation.topK,
        });
      }, "stream-generation");

      let chunkCount = 0;
      let fullResponse = "";

      for await (const chunk of stream) {
        chunkCount++;
        fullResponse += chunk;
        yield chunk;
      }

      console.info("Stream generation completed", {
        duration: Date.now() - overallStart,
        hasToolCalls,
        chunkCount,
        responseLength: fullResponse.length,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Stream generation failed", {
        error: errMsg,
        duration: Date.now() - overallStart,
        correlationId,
      });

      const fallbackResponse = this._buildFallbackResponse(errMsg);
      yield fallbackResponse;
      console.info("Fallback response emitted after stream failure", { correlationId });
      return;
    }
  }

  private async _prepareSystemMessage(
    options: GenerateStreamOptions,
    correlationId: string,
  ): Promise<{ systemMessage: string; ragContext?: RAGContext }> {
    const enableRAG = options.enableRAG ?? this._enableRAGByDefault;

    if (!enableRAG) {
      return { systemMessage: buildSystemPromptWithoutContext() };
    }

    try {
      const ragContext = await this._contextPreparationService.prepareContext(options.prompt);
      const systemMessage = ragContext.context
        ? buildSystemPromptWithContext(ragContext.context)
        : buildSystemPromptWithoutContext();

      return { systemMessage, ragContext };
    } catch (error) {
      console.error("Failed to prepare RAG system message", {
        error: error instanceof Error ? error.message : String(error),
        correlationId,
      });
      return { systemMessage: buildSystemPromptWithoutContext() };
    }
  }

  private _buildFallbackResponse(reason?: string): string {
    const baseMessage = "I'm having trouble accessing my knowledge base right now, so I can't share specific results.";
    if (!reason) {
      return `${baseMessage} Please try again later or ask in a different way.`;
    }
    return `${baseMessage} (${reason}). Please try again later or ask in a different way.`;
  }

  private _formatConversationContext(conversationContext: {
    recentMessages: ChatMessage[];
    summary?: string;
  }): string {
    const parts: string[] = [];

    if (conversationContext.summary) {
      parts.push(conversationContext.summary);
    }

    if (conversationContext.recentMessages.length > 0) {
      const formattedMessages = conversationContext.recentMessages
        .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n\n");
      parts.push(formattedMessages);
    }

    return parts.join("\n\n");
  }
}
