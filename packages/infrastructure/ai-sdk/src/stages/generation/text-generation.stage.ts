import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { TextGenerationInput, TextGenerationOutput } from "../../types/stages";
import { getAItClient, type AItClient } from "../../client/ai-sdk.client";

export class TextGenerationStage implements IPipelineStage<TextGenerationInput, TextGenerationOutput> {
  readonly name = "text-generation";

  private readonly _client: AItClient;

  constructor() {
    this._client = getAItClient();
  }

  async execute(input: TextGenerationInput, context: PipelineContext): Promise<TextGenerationOutput> {
    const textStream = this._client.streamText({
      prompt: input.finalPrompt,
      temperature: input.temperature,
      topP: input.topP ?? this._client.config.generation.topP,
      topK: input.topK ?? this._client.config.generation.topK,
    });

    return {
      ...input,
      textStream,
    };
  }
}
