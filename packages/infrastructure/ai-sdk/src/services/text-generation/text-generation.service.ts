import { getLogger } from "@ait/core";
import { getAItClient } from "../../client/ai-sdk.client";
import { type TextGenerationPipeline, createTextGenerationPipeline } from "../../pipelines/text-generation.pipeline";
import { MetadataExtractionStage } from "../../stages/generation/metadata-extraction.stage";
import { type GenerationTelemetryContext, createGenerationTelemetry } from "../../telemetry/generation-telemetry";
import type { StreamEvent } from "../../types";
import type { ChatMessage } from "../../types/chat";
import type { TextGenerationFeatureConfig } from "../../types/config";
import type { GenerationState } from "../../types/stages";
import type { Tool } from "../../types/tools";
import { AnalyticsService, getAnalyticsService } from "../analytics/analytics.service";
import { getErrorClassificationService } from "../errors/error-classification.service";
import { MetadataEmitterService } from "../streaming/metadata-emitter.service";

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
}

export interface GenerateTextOptions {
  prompt: string;
  messages?: ChatMessage[];
  tools?: Record<string, Tool>;
  maxToolRounds?: number;
  enableRAG?: boolean;
  telemetryOptions?: TelemetryOptions;
  enableMetadata?: boolean;
}

export interface ITextGenerationService {
  generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent>;
  generateText(options: GenerateTextOptions): Promise<string>;
}

export class TextGenerationService implements ITextGenerationService {
  readonly name = "text-generation";
  private readonly _pipeline: TextGenerationPipeline;
  private readonly _metadataEmitter: MetadataEmitterService;
  private readonly _metadataStage: MetadataExtractionStage;
  private readonly _analytics: AnalyticsService;

  constructor(config: TextGenerationConfig = {}) {
    const client = getAItClient();
    this._pipeline = createTextGenerationPipeline(client, {
      maxContextChars: config.contextPreparationConfig?.maxContextChars ?? 128000,
      embeddingsModel: config.embeddingsModel,
      maxDocs: config.multipleQueryPlannerConfig?.maxDocs,
      concurrency: config.multipleQueryPlannerConfig?.concurrency,
      relevanceFloor: config.multipleQueryPlannerConfig?.relevanceFloor,
      enableTelemetry: true,
    });

    this._metadataEmitter = new MetadataEmitterService();
    this._metadataStage = new MetadataExtractionStage();
    this._analytics = new AnalyticsService();
  }

  /**
   * Main entry point for streaming text generation.
   * Delegates all logic to the TextGenerationPipeline.
   */
  public async *generateStream(options: GenerateStreamOptions): AsyncGenerator<string | StreamEvent> {
    if (!options.prompt?.trim()) {
      throw new TextGenerationError("Prompt cannot be empty");
    }

    const telemetry = createGenerationTelemetry({
      name: "text-generation",
      enableTelemetry: options.telemetryOptions?.enableTelemetry,
      userId: options.telemetryOptions?.userId,
      sessionId: options.telemetryOptions?.sessionId,
      tags: options.telemetryOptions?.tags,
      metadata: options.telemetryOptions?.metadata as any,
    });

    telemetry.recordInput({
      prompt: options.prompt,
      messages: options.messages,
      enableRAG: options.enableRAG,
      tools: options.tools,
      maxToolRounds: options.maxToolRounds,
    });

    try {
      logger.info(`Starting stream generation for prompt: "${options.prompt.slice(0, 50)}..."`);

      // 1. Execute Pipeline
      const state = await this._pipeline.execute(
        {
          prompt: options.prompt,
          messages: options.messages || [],
          tools: options.tools,
          maxToolRounds: options.maxToolRounds,
          enableRAG: options.enableRAG ?? true,
          enableMetadata: options.enableMetadata ?? false,
        },
        { traceContext: telemetry.optionalContext },
      );

      logger.info("Generation pipeline completed successfully", {
        hasIntent: !!state.intent,
        needsRAG: state.intent?.needsRAG,
        needsTools: state.intent?.needsTools,
      });

      // 2. Handle Metadata (Context & Tools)
      yield* this._emitPreGenerationMetadata(state);

      // 3. Handle Stream
      let fullResponse = "";
      let chunkCount = 0;

      if (state.textStream) {
        logger.info("Starting text stream...");
        for await (const chunk of state.textStream) {
          chunkCount++;
          fullResponse += chunk;
          yield chunk;
        }
        logger.info("Text stream completed", { chunks: chunkCount, responseLength: fullResponse.length });
      }

      // 4. Finalize & Extract Post-Generation Metadata
      const finalizedState = await this._finalize(state, fullResponse, telemetry);

      // 5. Emit Post-Generation Metadata (Suggestions)
      yield* this._emitPostGenerationMetadata(finalizedState);

      telemetry.recordSuccess({
        response: fullResponse,
        chunkCount,
        responseLength: fullResponse.length,
      });

      this._trackAnalytics(telemetry.getDuration(), fullResponse);
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
      logger.info(`Starting text generation for prompt: "${options.prompt.slice(0, 50)}..."`);

      // 1. Execute Pipeline
      const state = await this._pipeline.execute(
        {
          prompt: options.prompt,
          messages: options.messages || [],
          tools: options.tools,
          maxToolRounds: options.maxToolRounds,
          enableRAG: options.enableRAG ?? true,
          enableMetadata: options.enableMetadata ?? false,
        },
        { traceContext: telemetry.optionalContext },
      );

      logger.info("Generation pipeline completed successfully", {
        hasIntent: !!state.intent,
        needsRAG: state.intent?.needsRAG,
        needsTools: state.intent?.needsTools,
      });

      // 2. Consume Stream (even for non-streaming, the stage returns a generator)
      let fullResponse = "";
      if (state.textStream) {
        for await (const chunk of state.textStream) {
          fullResponse += chunk;
        }
      }

      // 3. Finalize & Extract Post-Generation Metadata (Suggestions, etc)
      await this._finalize(state, fullResponse, telemetry);

      telemetry.recordSuccess({
        response: fullResponse,
        responseLength: fullResponse.length,
      });

      this._trackAnalytics(telemetry.getDuration(), fullResponse);

      return fullResponse;
    } catch (error: unknown) {
      // For generateText, we record and throw a proper error instead of yielding a message
      const errorClassifier = getErrorClassificationService();
      const classifiedError = errorClassifier.classify(error, "text-generation");

      telemetry.recordError(error, {
        errorCategory: classifiedError.category,
        errorSeverity: classifiedError.severity,
        errorFingerprint: classifiedError.fingerprint,
      });

      const analytics = getAnalyticsService();
      analytics.trackRequest({
        latencyMs: telemetry.getDuration(),
        success: false,
        error: classifiedError,
      });

      throw error instanceof TextGenerationError
        ? error
        : new TextGenerationError(`Text generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async *_emitPreGenerationMetadata(state: GenerationState): AsyncGenerator<StreamEvent> {
    if (!state.enableMetadata) return;

    // Emit RAG Context Metadata
    if (state.enableRAG) {
      yield this._metadataEmitter.createContextMetadataEvent(
        {
          context: state.ragContext || "",
          documents: state.ragResult?.documents || [],
          contextMetadata: {
            documentCount: state.ragResult?.documents?.length || 0,
            contextLength: state.ragContext?.length || 0,
            usedTemporalCorrelation: false,
          },
        },
        state.prompt,
      );
    }

    // Emit Tool Metadata
    if (state.orchestrationResult?.hasToolCalls) {
      yield this._metadataEmitter.createToolMetadataEvent({
        toolCalls: state.orchestrationResult.toolCalls,
        toolResults: state.orchestrationResult.toolResults,
        hasToolCalls: true,
      });
    }
  }

  private async *_emitPostGenerationMetadata(state: GenerationState): AsyncGenerator<StreamEvent> {
    if (state.enableMetadata && state.suggestions && state.suggestions.length > 0) {
      yield this._metadataEmitter.createSuggestionMetadataEvent(state.suggestions);
    }
  }

  private async _finalize(
    state: GenerationState,
    fullResponse: string,
    telemetry: GenerationTelemetryContext,
  ): Promise<GenerationState> {
    state.fullResponse = fullResponse;

    // Run final metadata extraction stage
    return await this._metadataStage.execute(state, {
      traceContext: telemetry.optionalContext,
      metadata: {},
      state: new Map(),
      telemetry: { recordStage: () => {} },
    });
  }

  private _trackAnalytics(duration: number, response: string): void {
    const estimatedTokens = this._analytics.getCostTracking().estimateTokens(response);

    this._analytics.trackRequest({
      latencyMs: duration,
      success: true,
      generationTokens: estimatedTokens,
    });
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

    this._analytics.trackRequest({
      latencyMs: telemetry.getDuration(),
      success: false,
      error: classifiedError,
    });

    const baseMessage = "I'm having trouble processing your request right now.";
    const reason = error instanceof Error ? error.message : String(error);
    yield `${baseMessage} (${reason}). Please try again later.`;
  }
}
