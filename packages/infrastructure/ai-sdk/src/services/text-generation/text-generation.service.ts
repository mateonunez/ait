import { getAItClient } from "../../client/ai-sdk.client";
import {
  createTraceContext,
  shouldEnableTelemetry,
  updateTraceInput,
  endTraceWithOutput,
  endTraceWithError,
} from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";
import { getErrorClassificationService } from "../errors/error-classification.service";
import { getAnalyticsService } from "../analytics/analytics.service";
import { createRAGPipeline } from "../../pipelines/rag.pipeline";
import type { ChatMessage } from "../../types/chat";
import type { Tool } from "../../types/tools";
import type { TextGenerationFeatureConfig } from "../../types/config";
import type { StreamEvent } from "../../types";
import { MetadataEmitterService, type RAGContextMetadata } from "../streaming/metadata-emitter.service";
import { PromptOrchestrationService } from "../orchestration/prompt-orchestration.service";

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
  enableMetadata?: boolean;
}

export interface ITextGenerationService {
  generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent>;
}

export class TextGenerationService implements ITextGenerationService {
  private readonly _enableRAGByDefault: boolean;
  private readonly _maxToolRounds: number;
  private readonly _ragPipeline: ReturnType<typeof createRAGPipeline>;
  private readonly _metadataEmitter: MetadataEmitterService;
  private readonly _promptOrchestrator: PromptOrchestrationService;

  constructor(config: TextGenerationConfig = {}) {
    const client = getAItClient();

    this._enableRAGByDefault = config.contextPreparationConfig?.enableRAG ?? true;
    this._maxToolRounds = config.toolExecutionConfig?.maxRounds ?? 1;

    this._ragPipeline = createRAGPipeline({
      embeddingsModel: config.embeddingsModel || client.embeddingModelConfig.name,
      vectorSize: client.embeddingModelConfig.vectorSize,
      maxDocs: config.multipleQueryPlannerConfig?.maxDocs ?? 100,
      queriesCount: config.multipleQueryPlannerConfig?.queriesCount ?? 12,
      concurrency: config.multipleQueryPlannerConfig?.concurrency ?? 4,
      enableTelemetry: true,
    });

    this._metadataEmitter = new MetadataEmitterService();
    this._promptOrchestrator = new PromptOrchestrationService(config.conversationConfig);
  }

  public async *generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent> {
    if (!options.prompt || !options.prompt.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const overallStart = Date.now();
    const enableMetadata = options.enableMetadata ?? false;

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
      const client = getAItClient();

      let fullResponse = "";
      let chunkCount = 0;
      const enableRAG = options.enableRAG ?? this._enableRAGByDefault;
      let contextToUse = "";

      if (enableRAG) {
        const ragResult = await this._ragPipeline.execute(
          { query: options.prompt, traceContext: traceContext || undefined },
          { traceContext: traceContext || undefined },
        );

        if (ragResult.success && ragResult.data) {
          const ragMetadata = ragResult.data as RAGContextMetadata;

          if (ragMetadata.context) {
            contextToUse = ragMetadata.context;
          }

          const rawDocuments =
            ragMetadata.rerankedDocuments || ragMetadata.fusedDocuments || ragMetadata.documents || [];
          if (enableMetadata && rawDocuments.length > 0) {
            const metadataEvent = this._metadataEmitter.createContextMetadataEvent(ragMetadata, options.prompt);
            yield metadataEvent;
          }
        }
      }

      const promptResult = await this._promptOrchestrator.orchestrate({
        userPrompt: options.prompt,
        ragContext: contextToUse,
        messages: options.messages,
        tools: options.tools,
        maxToolRounds: options.maxToolRounds ?? this._maxToolRounds,
        traceContext: traceContext,
      });

      if (enableMetadata && promptResult.hasToolCalls && promptResult.toolResults.length > 0) {
        const toolMetadataEvent = this._metadataEmitter.createToolMetadataEvent({
          toolCalls: promptResult.toolCalls,
          toolResults: promptResult.toolResults,
          hasToolCalls: promptResult.hasToolCalls,
        });
        yield toolMetadataEvent;
      }

      const finalPrompt = promptResult.finalPrompt;

      const stream = client.streamText({
        prompt: finalPrompt,
        temperature: client.config.generation.temperature,
        topP: client.config.generation.topP,
        topK: client.config.generation.topK,
      });

      for await (const chunk of stream) {
        chunkCount++;
        fullResponse += chunk;
        yield chunk;
      }

      const duration = Date.now() - overallStart;

      if (enableTelemetry && traceContext) {
        endTraceWithOutput(traceContext, {
          response: fullResponse,
          chunkCount,
          responseLength: fullResponse.length,
          duration,
        });
      }

      const analytics = getAnalyticsService();
      const estimatedTokens = analytics.getCostTracking().estimateTokens(fullResponse);

      analytics.trackRequest({
        latencyMs: duration,
        success: true,
        generationTokens: estimatedTokens,
        cacheHit: enableRAG,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);

      const errorClassifier = getErrorClassificationService();
      const classifiedError = errorClassifier.classify(error, "text-generation");

      if (enableTelemetry && traceContext) {
        endTraceWithError(traceContext, error, {
          errorCategory: classifiedError.category,
          errorSeverity: classifiedError.severity,
          errorFingerprint: classifiedError.fingerprint,
          isRetryable: classifiedError.isRetryable,
          suggestedAction: classifiedError.suggestedAction,
        });
      }

      const analytics = getAnalyticsService();
      analytics.trackRequest({
        latencyMs: Date.now() - overallStart,
        success: false,
        error: classifiedError,
      });

      const fallbackResponse = this._buildFallbackResponse(errMsg);
      yield fallbackResponse;
    }
  }

  private _buildFallbackResponse(reason?: string): string {
    const baseMessage = "I'm having trouble accessing my knowledge base right now, so I can't share specific results.";
    if (!reason) {
      return `${baseMessage} Please try again later or ask in a different way.`;
    }
    return `${baseMessage} (${reason}). Please try again later or ask in a different way.`;
  }
}
