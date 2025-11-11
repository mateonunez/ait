import { getAItClient, DEFAULT_RAG_COLLECTION } from "../../client/ai-sdk.client";
import { QdrantProvider } from "../rag/qdrant.provider";
import { createMultiQueryRetrievalService } from "../rag/multi-query-retrieval.factory";
import { buildSystemPromptWithContext, buildSystemPromptWithoutContext } from "../prompts/system.prompt";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { convertToOllamaTools } from "../../tools/tool.converter";
import { randomUUID } from "node:crypto";
import {
  createTraceContext,
  recordSpan,
  recordGeneration,
  shouldEnableTelemetry,
  updateTraceInput,
  endTraceWithOutput,
  endTraceWithError,
} from "../../telemetry/telemetry.middleware";
import { getLangfuseProvider } from "../../telemetry/langfuse.provider";
import type { TraceContext } from "../../types/telemetry";
import { getErrorClassificationService } from "../errors/error-classification.service";
import { getAnalyticsService } from "../analytics/analytics.service";

import { RetryService, type IRetryService } from "./retry.service";
import { ToolExecutionService, type IToolExecutionService } from "./tool-execution.service";
import { PromptBuilderService, type IPromptBuilderService } from "./prompt-builder.service";
import { ContextPreparationService, type IContextPreparationService } from "./context-preparation.service";
import { ConversationManagerService, type IConversationManagerService } from "./conversation-manager.service";
import { getReasoningExtractionService } from "../metadata/reasoning-extraction.service";
import { getTaskBreakdownService } from "../metadata/task-breakdown.service";
import { getSuggestionsService } from "../metadata/suggestions.service";
import { getModelInfoService } from "../metadata/model-info.service";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import type { ChatMessage } from "../../types/chat";
import type { Tool } from "../../types/tools";
import type { TextGenerationFeatureConfig } from "../../types/config";
import type { RAGContext } from "../../types/text-generation";
import type { StreamEvent, RAGContextMetadata, TaskStep } from "../../types";
import {
  STREAM_EVENT,
  METADATA_TYPE,
  updateTaskStatus,
  createToolCallMetadata,
  completeToolCall,
  failToolCall,
} from "../../types";

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
  enableTelemetry?: boolean;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: {
    version?: string;
    environment?: string;
    deploymentTimestamp?: string;
    model?: string;
    [key: string]: unknown;
  };
  /** Enable metadata streaming (context, reasoning, tasks, suggestions) */
  enableMetadata?: boolean;
}

export interface ITextGenerationService {
  generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent>;
}

function detectSourceType(doc: any): string {
  const metadata = doc.metadata || {};

  // Check for explicit source indicators
  if (metadata.spotifyTrack || metadata.track) return "spotify";
  if (metadata.twitterTweet || metadata.tweet) return "twitter";
  if (metadata.githubPR || metadata.pull_request) return "github";
  if (metadata.url) {
    if (metadata.url.includes("spotify.com")) return "spotify";
    if (metadata.url.includes("twitter.com") || metadata.url.includes("x.com")) return "twitter";
    if (metadata.url.includes("github.com")) return "github";
  }

  // Check content type
  if (metadata.content_type === "music" || metadata.type === "track") return "spotify";
  if (metadata.content_type === "social" || metadata.type === "tweet") return "twitter";
  if (metadata.content_type === "code" || metadata.type === "pr") return "github";

  return "document";
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

  public async *generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const correlationId = randomUUID();
    const overallStart = Date.now();
    const enableMetadata = options.enableMetadata ?? false;

    // Initialize metadata services
    const reasoningService = getReasoningExtractionService();
    const taskService = getTaskBreakdownService();
    const suggestionsService = getSuggestionsService();
    const modelInfoService = getModelInfoService();

    let traceContext: TraceContext | null = null;
    const enableTelemetry = shouldEnableTelemetry(options);

    if (enableTelemetry) {
      traceContext = createTraceContext("text-generation", {
        userId: options.userId,
        sessionId: options.sessionId,
        tags: options.tags,
        version: options.metadata?.version,
        environment: options.metadata?.environment,
        deploymentTimestamp: options.metadata?.deploymentTimestamp,
      });

      // Set trace input immediately after creation
      if (traceContext) {
        updateTraceInput(traceContext, {
          prompt: options.prompt,
          messages: options.messages,
          enableRAG: options.enableRAG,
          tools: options.tools ? Object.keys(options.tools) : undefined,
          maxToolRounds: options.maxToolRounds,
        });
      }
    }

    try {
      console.info("Starting stream text generation", {
        prompt: options.prompt.slice(0, 100),
        hasMessages: !!options.messages && options.messages.length > 0,
        messageCount: options.messages?.length || 0,
        telemetryEnabled: enableTelemetry,
      });

      const client = getAItClient();

      // Yield model metadata if enabled
      if (enableMetadata) {
        const modelId = options.metadata?.model || client.generationModelConfig.name;
        const modelInfo = modelInfoService.getModelInfo(modelId);
        if (modelInfo) {
          yield {
            type: STREAM_EVENT.METADATA,
            data: {
              type: METADATA_TYPE.MODEL,
              data: modelInfo,
            },
          };
        }
      }

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

      if (enableTelemetry && traceContext) {
        recordSpan(
          "conversation-processing",
          "conversation",
          traceContext,
          {
            messageCount: options.messages?.length || 0,
          },
          {
            recentMessageCount: conversationContext.recentMessages.length,
            hasSummary: !!conversationContext.summary,
            estimatedTokens: conversationContext.estimatedTokens,
          },
        );
      }

      // Prepare system message with RAG context if enabled (pass traceContext)
      const { systemMessage, ragContext } = await this._prepareSystemMessage(options, correlationId, traceContext);

      // Track metadata for Langfuse
      let ragMetadata: RAGContextMetadata | null = null;
      const collectedReasoningSteps: any[] = [];
      const collectedTasks: TaskStep[] = [];
      const collectedToolCalls: any[] = [];
      const collectedSuggestions: any[] = [];

      // Yield RAG context metadata if enabled
      if (enableMetadata && ragContext) {
        ragMetadata = {
          documents: ragContext.documents.map((doc: any) => ({
            id: doc.id || `doc-${Date.now()}`,
            content: doc.pageContent || doc.content || "",
            score: typeof doc.score === "number" ? doc.score : doc.metadata?.score || 0.5,
            source: {
              type: doc.metadata?.source || doc.metadata?.type || detectSourceType(doc),
              identifier: doc.metadata?.id || doc.metadata?.identifier,
              url: doc.metadata?.url,
              metadata: doc.metadata,
            },
            timestamp: doc.metadata?.timestamp || doc.metadata?.created_at || Date.now(),
            entityTypes: doc.metadata?.entityTypes || doc.metadata?.entity_types || [],
          })),
          query: ragContext.query,
          fallbackUsed: ragContext.fallbackUsed ?? false,
          fallbackReason: ragContext.fallbackReason,
          timestamp: ragContext.timestamp,
          usedTemporalCorrelation: Boolean(ragContext.documents.length > 0),
          contextLength: ragContext.context.length,
          retrievalTimeMs: Date.now() - ragContext.timestamp,
        };

        yield {
          type: STREAM_EVENT.METADATA,
          data: {
            type: METADATA_TYPE.CONTEXT,
            data: ragMetadata,
          },
        };

        // Record RAG context in Langfuse
        if (enableTelemetry && traceContext) {
          recordSpan(
            "rag-context",
            "rag",
            traceContext,
            { query: ragContext.query },
            {
              documentsCount: ragMetadata.documents.length,
              contextLength: ragMetadata.contextLength,
              retrievalTimeMs: ragMetadata.retrievalTimeMs,
              fallbackUsed: ragMetadata.fallbackUsed,
              documents: ragMetadata.documents.map((doc) => ({
                id: doc.id,
                score: doc.score,
                sourceType: doc.source?.type,
                contentPreview: doc.content.substring(0, 200),
              })),
            },
          );
        }
      }

      // Break down complex queries into tasks if enabled
      let tasks: TaskStep[] = [];
      if (enableMetadata && taskService.isComplexQuery(options.prompt)) {
        tasks = taskService.breakdownQuery(options.prompt);
        collectedTasks.push(...tasks);
        for (const task of tasks) {
          yield {
            type: STREAM_EVENT.METADATA,
            data: {
              type: METADATA_TYPE.TASK,
              data: task,
            },
          };
        }

        // Record task breakdown in Langfuse
        if (enableTelemetry && traceContext) {
          recordSpan(
            "task-breakdown",
            "generation",
            traceContext,
            { query: options.prompt },
            {
              taskCount: tasks.length,
              tasks: tasks.map((t) => ({
                id: t.id,
                description: t.description,
                status: t.status,
              })),
            },
          );
        }
      }

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

          // Yield tool call metadata if enabled
          if (enableMetadata) {
            for (const toolCall of checkResult.toolCalls) {
              const toolMeta = createToolCallMetadata(toolCall.function.name, toolCall.function.arguments);
              const executingMeta = { ...toolMeta, status: "executing" as const };
              collectedToolCalls.push(executingMeta);
              yield {
                type: STREAM_EVENT.METADATA,
                data: {
                  type: METADATA_TYPE.TOOL_CALL,
                  data: executingMeta,
                },
              };
            }
          }

          // Pass traceContext to tool execution for telemetry
          const toolResults = await this._toolExecutionService.executeToolCalls(
            checkResult.toolCalls,
            options.tools,
            traceContext,
          );

          // Yield completed tool call metadata if enabled
          if (enableMetadata) {
            for (let i = 0; i < checkResult.toolCalls.length; i++) {
              const toolCall = checkResult.toolCalls[i];
              const result = toolResults[i];

              if (toolCall && result) {
                const toolMeta = createToolCallMetadata(toolCall.function.name, toolCall.function.arguments);
                const completedMeta = result.error
                  ? failToolCall(toolMeta, result.error)
                  : completeToolCall(toolMeta, result.result);

                // Update collected tool calls (replace executing status with completed/failed)
                const toolIndex = collectedToolCalls.findIndex((t) => t.name === toolCall.function.name);
                if (toolIndex >= 0) {
                  collectedToolCalls[toolIndex] = completedMeta;
                }

                yield {
                  type: STREAM_EVENT.METADATA,
                  data: {
                    type: METADATA_TYPE.TOOL_CALL,
                    data: completedMeta,
                  },
                };
              }
            }
          }

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

      // Update task status if we're tracking tasks
      if (enableMetadata && tasks.length > 0 && tasks[0]) {
        const firstTask = updateTaskStatus(tasks[0], "in_progress");
        yield {
          type: STREAM_EVENT.METADATA,
          data: {
            type: METADATA_TYPE.TASK,
            data: firstTask,
          },
        };
      }

      for await (const chunk of stream) {
        chunkCount++;
        fullResponse += chunk;
        yield chunk;
      }

      // Mark tasks as completed if tracking
      if (enableMetadata && tasks.length > 0) {
        for (const task of tasks) {
          const completedTask = updateTaskStatus(task, "completed", fullResponse.slice(0, 100));
          yield {
            type: STREAM_EVENT.METADATA,
            data: {
              type: METADATA_TYPE.TASK,
              data: completedTask,
            },
          };
        }
      }

      // Extract reasoning if enabled
      if (enableMetadata && reasoningService.detectReasoningPatterns(fullResponse)) {
        const reasoningSteps = reasoningService.extractReasoning(fullResponse);
        collectedReasoningSteps.push(...reasoningSteps);
        for (const step of reasoningSteps) {
          yield {
            type: STREAM_EVENT.METADATA,
            data: {
              type: METADATA_TYPE.REASONING,
              data: step,
            },
          };
        }

        // Record reasoning in Langfuse
        if (enableTelemetry && traceContext) {
          recordSpan(
            "reasoning-extraction",
            "generation",
            traceContext,
            { responseText: fullResponse.substring(0, 500) },
            {
              stepCount: reasoningSteps.length,
              steps: reasoningSteps.map((s) => ({
                id: s.id,
                type: s.type,
                order: s.order,
                contentPreview: s.content.substring(0, 100),
                confidence: s.confidence,
              })),
            },
          );
        }
      }

      // Generate suggestions if enabled
      if (enableMetadata) {
        const suggestions = suggestionsService.generateSuggestions(options.prompt, fullResponse, options.messages);
        collectedSuggestions.push(...suggestions);
        if (suggestions.length > 0) {
          yield {
            type: STREAM_EVENT.METADATA,
            data: {
              type: METADATA_TYPE.SUGGESTION,
              data: suggestions,
            },
          };

          // Record suggestions in Langfuse
          if (enableTelemetry && traceContext) {
            recordSpan(
              "suggestions-generation",
              "generation",
              traceContext,
              { userQuery: options.prompt, responseText: fullResponse.substring(0, 200) },
              {
                suggestionCount: suggestions.length,
                suggestions: suggestions.map((s) => ({
                  id: s.id,
                  type: s.type,
                  text: s.text,
                })),
              },
            );
          }
        }
      }

      const duration = Date.now() - overallStart;

      console.info("Stream generation completed", {
        duration,
        hasToolCalls,
        chunkCount,
        responseLength: fullResponse.length,
      });

      if (enableTelemetry && traceContext) {
        // Record generation observation with full data
        recordGeneration(
          traceContext,
          "llm-generation",
          {
            prompt: currentPrompt,
            model: client.generationModelConfig.name,
          },
          {
            text: fullResponse,
          },
          {
            model: client.generationModelConfig.name,
            temperature: client.config.generation.temperature,
            topP: client.config.generation.topP,
            topK: client.config.generation.topK,
          },
        );

        // End trace with complete output including all metadata
        endTraceWithOutput(traceContext, {
          response: fullResponse,
          chunkCount,
          responseLength: fullResponse.length,
          duration,
          hasToolCalls,
          // Include all collected metadata for comprehensive tracking
          metadata: {
            ragContext: ragMetadata
              ? {
                  documentsCount: ragMetadata.documents.length,
                  contextLength: ragMetadata.contextLength,
                  retrievalTimeMs: ragMetadata.retrievalTimeMs,
                  fallbackUsed: ragMetadata.fallbackUsed,
                  query: ragMetadata.query,
                }
              : undefined,
            reasoning:
              collectedReasoningSteps.length > 0
                ? {
                    stepCount: collectedReasoningSteps.length,
                    types: collectedReasoningSteps.map((s) => s.type),
                  }
                : undefined,
            tasks:
              collectedTasks.length > 0
                ? {
                    taskCount: collectedTasks.length,
                    statuses: collectedTasks.map((t) => t.status),
                  }
                : undefined,
            toolCalls:
              collectedToolCalls.length > 0
                ? {
                    toolCount: collectedToolCalls.length,
                    tools: collectedToolCalls.map((t) => ({
                      name: t.name,
                      status: t.status,
                      durationMs: t.durationMs,
                    })),
                  }
                : undefined,
            suggestions:
              collectedSuggestions.length > 0
                ? {
                    suggestionCount: collectedSuggestions.length,
                    types: collectedSuggestions.map((s) => s.type),
                  }
                : undefined,
          },
        });
      }

      // Track analytics
      const analytics = getAnalyticsService();
      const estimatedTokens = analytics.getCostTracking().estimateTokens(fullResponse);
      const estimatedCost = analytics
        .getCostTracking()
        .calculateCost(estimatedTokens, client.generationModelConfig.name, "generation");

      analytics.trackRequest({
        latencyMs: duration,
        success: true,
        generationTokens: estimatedTokens,
        cacheHit: ragContext?.fallbackUsed === false && ragContext?.documents && ragContext.documents.length > 0,
      });

      // Update trace with cost metadata
      if (enableTelemetry && traceContext) {
        const langfuseProvider = getLangfuseProvider();
        if (langfuseProvider?.isEnabled()) {
          langfuseProvider.updateTraceOutput(traceContext.traceId, {
            generationTokens: estimatedTokens,
            estimatedCost,
          });
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);

      // Classify error for better tracking
      const errorClassifier = getErrorClassificationService();
      const classifiedError = errorClassifier.classify(error, "text-generation");

      console.error("Stream generation failed", {
        error: errMsg,
        duration: Date.now() - overallStart,
        correlationId,
        errorCategory: classifiedError.category,
        errorSeverity: classifiedError.severity,
        errorFingerprint: classifiedError.fingerprint,
        isRetryable: classifiedError.isRetryable,
        suggestedAction: classifiedError.suggestedAction,
      });

      // End trace with classified error metadata
      if (enableTelemetry && traceContext) {
        endTraceWithError(traceContext, error, {
          errorCategory: classifiedError.category,
          errorSeverity: classifiedError.severity,
          errorFingerprint: classifiedError.fingerprint,
          isRetryable: classifiedError.isRetryable,
          suggestedAction: classifiedError.suggestedAction,
        });
      }

      // Track analytics for failed request
      const analytics = getAnalyticsService();
      analytics.trackRequest({
        latencyMs: Date.now() - overallStart,
        success: false,
        error: classifiedError,
      });

      const fallbackResponse = this._buildFallbackResponse(errMsg);
      yield fallbackResponse;
      console.info("Fallback response emitted after stream failure", {
        correlationId,
        errorFingerprint: classifiedError.fingerprint,
      });
      return;
    }
  }

  private async _prepareSystemMessage(
    options: GenerateStreamOptions,
    correlationId: string,
    traceContext?: TraceContext | null,
  ): Promise<{ systemMessage: string; ragContext?: RAGContext }> {
    const enableRAG = options.enableRAG ?? this._enableRAGByDefault;

    if (!enableRAG) {
      return { systemMessage: buildSystemPromptWithoutContext() };
    }

    try {
      // Pass traceContext to context preparation for full RAG telemetry
      const ragContext = await this._contextPreparationService.prepareContext(options.prompt, traceContext);
      const systemMessage = ragContext.context
        ? buildSystemPromptWithContext(ragContext.context)
        : buildSystemPromptWithoutContext();

      return { systemMessage, ragContext };
    } catch (error) {
      // Classify RAG error
      const errorClassifier = getErrorClassificationService();
      const classifiedError = errorClassifier.classify(error, "rag-preparation");

      console.error("Failed to prepare RAG system message", {
        error: error instanceof Error ? error.message : String(error),
        correlationId,
        errorCategory: classifiedError.category,
        errorFingerprint: classifiedError.fingerprint,
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
