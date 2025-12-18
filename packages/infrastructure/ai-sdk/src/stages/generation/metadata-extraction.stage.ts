import { getLogger } from "@ait/core";
import { getSuggestionService } from "../../services/generation/suggestion.service";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { MetadataExtractionInput, MetadataExtractionOutput } from "../../types/stages";

const logger = getLogger();

export class MetadataExtractionStage implements IPipelineStage<MetadataExtractionInput, MetadataExtractionOutput> {
  readonly name = "metadata-extraction";

  async canExecute(_input: MetadataExtractionInput): Promise<boolean> {
    return true;
  }

  async execute(input: MetadataExtractionInput, context: PipelineContext): Promise<MetadataExtractionOutput> {
    const startTime = Date.now();
    const endSpan = context.traceContext
      ? createSpanWithTiming(
          "generation/metadata-extraction",
          "task",
          context.traceContext,
          {
            responseLength: input.fullResponse.length,
          },
          undefined,
          new Date(startTime),
        )
      : null;

    const suggestionsService = getSuggestionService();

    const suggestions = await suggestionsService.generateSuggestions({
      context: input.prompt,
      history: input.fullResponse,
    });

    const telemetryData = {
      suggestionsCount: suggestions.length,
      duration: Date.now() - startTime,
    };

    if (endSpan) endSpan(telemetryData);

    logger.info(`Stage [${this.name}] completed`, telemetryData);

    return {
      ...input,
      suggestions,
    };
  }
}
