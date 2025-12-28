import { getLogger } from "@ait/core";
import { stream as streamGeneration } from "../../generation/stream";
import { generate as generateText } from "../../generation/text";
import { getAnalyticsProvider } from "../../providers";
import { rerank } from "../../rag/rerank";
import { type RetrievedDocument, retrieve } from "../../rag/retrieve";
import { type GenerationTelemetryContext, createGenerationTelemetry } from "../../telemetry/generation-telemetry";
import { STREAM_EVENT, type StreamEvent } from "../../types";
import type { ChatMessage } from "../../types/chat";
import type { TextGenerationFeatureConfig } from "../../types/config";
import type { Tool } from "../../types/tools";
import { SmartContextManager } from "../context/smart/smart-context.manager";
import { getErrorClassificationService } from "../errors/error-classification.service";
import { TypeFilterService } from "../filtering/type-filter.service";
import { MetadataEmitterService } from "../streaming/metadata-emitter.service";
import { selectToolsForPrompt } from "../tools/tool-selection";

const logger = getLogger();

export class TextGenerationError extends Error {
  constructor(
    message: string,
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = "TextGenerationError";
  }
}

export interface TextGenerationConfig extends TextGenerationFeatureConfig {
  model?: string;
  embeddingsModel?: string;
}

export interface GenerateOptions {
  prompt: string;
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  messages?: ChatMessage[];
  telemetryOptions?: TelemetryOptions;
  model?: string;
}

export type TelemetryOptions = {
  enableTelemetry?: boolean;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export interface GenerateStreamOptions {
  prompt: string;
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  messages?: ChatMessage[];
  telemetryOptions?: TelemetryOptions;
  enableMetadata?: boolean;
  model?: string;
}

export interface GenerateTextOptions {
  prompt: string;
  messages?: ChatMessage[];
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  telemetryOptions?: TelemetryOptions;
  enableMetadata?: boolean;
  model?: string;
}

export interface ITextGenerationService {
  generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent>;
  generateText(options: GenerateTextOptions): Promise<string>;
}

export class TextGenerationService implements ITextGenerationService {
  readonly name = "text-generation";
  private readonly _metadataEmitter: MetadataEmitterService;
  private readonly _config: TextGenerationConfig;
  private readonly _contextManager: SmartContextManager;
  private readonly _typeFilterService: TypeFilterService;

  constructor(config: TextGenerationConfig = {}) {
    this._config = config;
    this._metadataEmitter = new MetadataEmitterService();
    this._contextManager = new SmartContextManager({
      totalTokenLimit: config.contextPreparationConfig?.maxContextChars
        ? Math.floor(config.contextPreparationConfig.maxContextChars / 4)
        : undefined,
    });
    this._typeFilterService = new TypeFilterService();
  }

  public async *generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent> {
    if (!options.prompt?.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const finalPrompt = options.prompt;
    const typeFilter = this._typeFilterService.inferTypes(undefined, finalPrompt);
    const toolSelection = options.tools
      ? selectToolsForPrompt({
          prompt: finalPrompt,
          inferredTypes: typeFilter?.types as any,
          tools: options.tools,
        })
      : null;

    const toolsForModel = toolSelection?.selectedTools ?? options.tools;

    const telemetry = createGenerationTelemetry({
      name: "text-generation",
      enableTelemetry: options.telemetryOptions?.enableTelemetry,
      traceId: options.telemetryOptions?.traceId,
      userId: options.telemetryOptions?.userId,
      sessionId: options.telemetryOptions?.sessionId,
      tags: options.telemetryOptions?.tags,
      metadata: {
        ...(options.telemetryOptions?.metadata as any),
        toolSelection: toolSelection
          ? {
              originalToolsCount: toolSelection.originalToolNames.length,
              selectedToolsCount: toolSelection.selectedToolNames.length,
              selectedVendors: toolSelection.selectedVendors,
              writeEnabled: toolSelection.writeEnabled,
              reason: toolSelection.reason,
            }
          : undefined,
      },
    });

    telemetry.recordInput({
      prompt: finalPrompt,
      messages: options.messages,
      enableRAG: options.enableRAG,
      tools: toolsForModel,
      maxToolRounds: options.maxToolRounds,
    });

    if (toolSelection) {
      logger.info("[ToolSelection] Tools filtered for generation", {
        originalToolsCount: toolSelection.originalToolNames.length,
        selectedToolsCount: toolSelection.selectedToolNames.length,
        selectedVendors: toolSelection.selectedVendors,
        writeEnabled: toolSelection.writeEnabled,
        reason: toolSelection.reason,
        selectedToolNames: toolSelection.selectedToolNames.slice(0, 30),
      });
    }

    try {
      let ragContext: string | undefined;
      let ragDocuments: RetrievedDocument[] = [];

      // RAG flow using composable functions
      if (options.enableRAG) {
        // 2.1 Extract Filters
        // 3. Retrieval
        const retrieval = await retrieve({
          query: finalPrompt,
          types: typeFilter?.types,
          limit: this._config.multipleQueryPlannerConfig?.maxDocs ?? 20,
          scoreThreshold: this._config.multipleQueryPlannerConfig?.relevanceFloor ?? 0.4,
          filter: typeFilter?.timeRange
            ? {
                fromDate: typeFilter.timeRange.from,
                toDate: typeFilter.timeRange.to,
              }
            : undefined,
          traceContext: telemetry.optionalContext,
          enableCache: true, // Core feature restoration
        });

        if (retrieval.documents.length > 0) {
          // 4. Reranking
          const ranked = rerank({
            query: finalPrompt,
            documents: retrieval.documents,
            topK: 10,
          });

          ragDocuments = ranked.documents;

          // 5. Smart Context Assembly
          ragContext = await this._contextManager.assembleContext({
            systemInstructions: "",
            messages: options.messages || [],
            retrievedDocs: ragDocuments.map((d) => ({
              pageContent: d.content,
              metadata: {
                id: d.id,
                __type: "document",
                source: d.source || (d.metadata?.source as string),
                collection: d.collection,
                ...d.metadata,
              },
            })),
          });
        }
      }

      // Emit RAG metadata if enabled
      if (options.enableMetadata && options.enableRAG && ragContext) {
        yield this._metadataEmitter.createContextMetadataEvent(
          {
            context: ragContext,
            documents: ragDocuments,
            contextMetadata: {
              documentCount: ragDocuments.length,
              contextLength: ragContext.length,
              usedTemporalCorrelation: false,
            },
          },
          options.prompt,
        );
      }

      // Stream using new thin wrapper
      let fullResponse = "";
      let chunkCount = 0;

      const { textStream } = await streamGeneration({
        prompt: finalPrompt,
        messages: options.messages,
        tools: toolsForModel as any,
        enableTelemetry: options.telemetryOptions?.enableTelemetry,
        traceContext: telemetry.optionalContext, // Pass trace context for Langfuse spans
        ragContext, // Pass RAG context for AIt system prompt
        maxToolRounds: options.maxToolRounds,
        model: options.model,
      });

      for await (const chunk of textStream) {
        chunkCount++;
        fullResponse += chunk;
        yield chunk;
      }

      logger.debug("Stream completed", { chunkCount, responseLength: fullResponse.length });

      telemetry.recordSuccess({
        response: fullResponse,
        chunkCount,
        responseLength: fullResponse.length,
      });

      const analytics = getAnalyticsProvider();
      if (analytics) {
        analytics.trackRequest({
          latencyMs: telemetry.getDuration(),
          success: true,
          generationTokens: 0, // TODO: Token estimation logic was here
          responseLength: fullResponse.length,
          model: options.model,
        });
      }
    } catch (error: unknown) {
      yield* this._handleError(error, telemetry);
    }
  }

  public async generateText(options: GenerateTextOptions): Promise<string> {
    if (!options.prompt?.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const telemetry = createGenerationTelemetry({
      name: "text-generation",
      enableTelemetry: options.telemetryOptions?.enableTelemetry,
      traceId: options.telemetryOptions?.traceId,
      userId: options.telemetryOptions?.userId,
      sessionId: options.telemetryOptions?.sessionId,
      tags: options.telemetryOptions?.tags,
      metadata: options.telemetryOptions?.metadata as any,
    });

    telemetry.recordInput({
      prompt: options.prompt,
      messages: options.messages,
    });

    try {
      const finalPrompt = options.prompt;
      let ragContext: string | undefined;

      // RAG flow using composable functions
      if (options.enableRAG) {
        // 2.1 Extract Filters
        const typeFilter = this._typeFilterService.inferTypes(undefined, finalPrompt);

        // 3. Retrieval
        const retrieval = await retrieve({
          query: finalPrompt,
          types: typeFilter?.types,
          limit: this._config.multipleQueryPlannerConfig?.maxDocs ?? 20,
          scoreThreshold: this._config.multipleQueryPlannerConfig?.relevanceFloor ?? 0.4,
          filter: typeFilter?.timeRange
            ? {
                fromDate: typeFilter.timeRange.from,
                toDate: typeFilter.timeRange.to,
              }
            : undefined,
          traceContext: telemetry.optionalContext,
          enableCache: true, // Core feature restoration
        });

        if (retrieval.documents.length > 0) {
          const ranked = rerank({
            query: finalPrompt,
            documents: retrieval.documents,
            topK: 10,
          });

          // 5. Smart Context Assembly
          ragContext = await this._contextManager.assembleContext({
            systemInstructions: "",
            messages: options.messages || [],
            retrievedDocs: ranked.documents.map((d) => ({
              pageContent: d.content,
              metadata: {
                id: d.id,
                __type: "document",
                source: d.source || (d.metadata?.source as string),
                collection: d.collection,
                ...d.metadata,
              },
            })),
          });
        }
      }

      // Generate using new thin wrapper
      const result = await generateText({
        prompt: finalPrompt,
        messages: options.messages,
        tools: options.tools as any,
        enableTelemetry: options.telemetryOptions?.enableTelemetry,
        traceContext: telemetry.optionalContext, // Pass trace context for Langfuse spans
        ragContext, // Pass RAG context for AIt system prompt
        maxToolRounds: options.maxToolRounds,
        model: options.model,
      });

      telemetry.recordSuccess({
        response: result.text,
        responseLength: result.text.length,
      });

      const analytics = getAnalyticsProvider();
      if (analytics) {
        analytics.trackRequest({
          latencyMs: telemetry.getDuration(),
          success: true,
          generationTokens: 0, // TODO: Token estimation logic
          responseLength: result.text.length,
          model: options.model,
        });
      }

      return result.text;
    } catch (error: unknown) {
      const errorClassifier = getErrorClassificationService();
      const classifiedError = errorClassifier.classify(error, "text-generation");

      telemetry.recordError(error, {
        errorCategory: classifiedError.category,
        errorSeverity: classifiedError.severity,
        errorFingerprint: classifiedError.fingerprint,
      });

      const analytics = getAnalyticsProvider();
      if (analytics) {
        analytics.trackRequest({
          latencyMs: telemetry.getDuration(),
          success: false,
          error: classifiedError,
          model: options.model,
        });
      }

      throw error instanceof TextGenerationError
        ? error
        : new TextGenerationError(`Text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async *_handleError(
    error: unknown,
    telemetry: GenerationTelemetryContext,
  ): AsyncGenerator<string | StreamEvent> {
    const errorClassifier = getErrorClassificationService();
    const classifiedError = errorClassifier.classify(error, "text-generation");

    telemetry.recordError(error, {
      errorCategory: classifiedError.category,
      errorSeverity: classifiedError.severity,
      errorFingerprint: classifiedError.fingerprint,
      isRetryable: classifiedError.isRetryable,
      suggestedAction: classifiedError.suggestedAction,
    });

    // Ensure we log the original exception (this path intentionally doesn't throw).
    logger.error("[TextGenerationService] Stream generation failed", {
      error: {
        name: classifiedError.originalError.name,
        message: classifiedError.originalError.message,
        stack: classifiedError.originalError.stack,
      },
      traceId: telemetry.traceContext?.traceId,
      errorCategory: classifiedError.category,
      errorSeverity: classifiedError.severity,
      errorFingerprint: classifiedError.fingerprint,
      isRetryable: classifiedError.isRetryable,
      suggestedAction: classifiedError.suggestedAction,
      errorMetadata: classifiedError.metadata,
    });

    const analytics = getAnalyticsProvider();
    if (analytics) {
      analytics.trackRequest({
        latencyMs: telemetry.getDuration(),
        success: false,
        error: classifiedError,
      });
    }

    const baseMessage = "I'm having trouble processing your request right now.";
    const reason = error instanceof Error ? error.message : String(error);
    yield {
      type: STREAM_EVENT.ERROR,
      data: `${baseMessage} (${reason}). Please try again later.`,
    };
  }
}
