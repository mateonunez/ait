import { getLogger } from "@ait/core";
import type { AItClient } from "../../client/ai-sdk.client";
import type { IPipelineStage, PipelineContext } from "../../services/rag/pipeline/pipeline.types";
import type { GenerationState } from "../../types/stages";

const logger = getLogger();

export class StreamingGenerationStage implements IPipelineStage<GenerationState, GenerationState> {
  readonly name = "streaming-generation";

  private readonly _client: AItClient;

  constructor(client: AItClient) {
    this._client = client;
  }

  async canExecute(_input: GenerationState): Promise<boolean> {
    return true;
  }

  async execute(input: GenerationState, _context: PipelineContext): Promise<GenerationState> {
    const { orchestrationResult } = input;

    if (!orchestrationResult) {
      throw new Error("Prompt orchestration result missing");
    }

    logger.info(`Stage [${this.name}] initiating stream`, {
      hasFinalResponse: !!orchestrationResult.finalTextResponse,
    });

    const textStream = this._createStream(orchestrationResult, this._client);

    return {
      ...input,
      textStream,
    };
  }

  private async *_createStream(
    orchestrationResult: Required<GenerationState>["orchestrationResult"],
    client: AItClient,
  ): AsyncGenerator<string> {
    if (orchestrationResult.finalTextResponse) {
      yield orchestrationResult.finalTextResponse;
      return;
    }

    const stream = client.streamText({
      prompt: orchestrationResult.finalPrompt,
      messages: orchestrationResult.accumulatedMessages,
      temperature: client.config.generation.temperature,
      topP: client.config.generation.topP,
      topK: client.config.generation.topK,
    });

    for await (const chunk of stream) {
      yield chunk;
    }
  }
}
