import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { MetadataExtractionInput, MetadataExtractionOutput } from "../../types/stages";
import { getReasoningExtractionService } from "../../services/metadata/reasoning-extraction.service";
import { getTaskBreakdownService } from "../../services/metadata/task-breakdown.service";
import { getModelInfoService } from "../../services/metadata/model-info.service";
import { getAItClient } from "../../client/ai-sdk.client";
import { getSuggestionService } from "../../services/generation/suggestion.service";

export class MetadataExtractionStage implements IPipelineStage<MetadataExtractionInput, MetadataExtractionOutput> {
  readonly name = "metadata-extraction";

  async canExecute(input: MetadataExtractionInput): Promise<boolean> {
    return true;
  }

  async execute(input: MetadataExtractionInput, context: PipelineContext): Promise<MetadataExtractionOutput> {
    const reasoningService = getReasoningExtractionService();
    const taskService = getTaskBreakdownService();
    const suggestionsService = getSuggestionService();
    const modelInfoService = getModelInfoService();

    const reasoning = reasoningService.extractReasoning(input.fullResponse);
    const tasks = taskService.isComplexQuery(input.prompt) ? taskService.breakdownQuery(input.prompt) : [];
    const suggestions = await suggestionsService.generateSuggestions({
      context: input.prompt,
      history: input.fullResponse,
    });

    const client = getAItClient();
    const modelInfo = modelInfoService.getModelInfo(client.generationModelConfig.name);

    return {
      ...input,
      reasoning,
      tasks,
      suggestions,
      modelInfo,
    };
  }
}
