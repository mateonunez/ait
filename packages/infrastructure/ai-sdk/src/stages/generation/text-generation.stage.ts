import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { TextGenerationInput, TextGenerationOutput } from "../../types/stages";
import { getAItClient } from "../../client/ai-sdk.client";

export class TextGenerationStage implements IPipelineStage<TextGenerationInput, TextGenerationOutput> {
  readonly name = "text-generation";

  async execute(input: TextGenerationInput, context: PipelineContext): Promise<TextGenerationOutput> {
    const client = getAItClient();

    const textStream = client.streamText({
      prompt: input.finalPrompt,
      temperature: input.temperature,
      topP: input.topP,
      topK: input.topK,
    });

    return {
      ...input,
      textStream,
    };
  }
}
