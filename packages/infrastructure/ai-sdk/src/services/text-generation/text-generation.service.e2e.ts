import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { initAItClient } from "../../client/ai-sdk.client";
import { EmbeddingModels, GenerationModels } from "../../config/models.config";
import type { ChatMessage } from "../../types/chat";
import type { StreamEvent } from "../../types/streaming/stream-events";
import { TextGenerationService } from "./text-generation.service";
import { smoothStream } from "./utils/stream.utils";

describe("AIt Personality Integration (AI SDK)", () => {
  const timeout = 1800000;

  let service: TextGenerationService;

  beforeEach(() => {
    initAItClient({
      generation: { model: GenerationModels.GEMMA_3, temperature: 0.7 },
      embeddings: { model: EmbeddingModels.MXBAI_EMBED_LARGE },
      logger: true,
    });

    service = new TextGenerationService();
  });

  it.only(
    "should analyze knowledge base with sharp analytical personality and depth",
    { timeout: timeout },
    async () => {
      const prompt = `
      Raccontami di te. Cosa ti spinge? Cosa stai costruendo e perché? 
      Non voglio un curriculum o un'analisi di pattern, voglio capire chi sei 
      attraverso ciò che crei, ciò che ascolti, ciò che condividi. Sii onesto, diretto, 
      salta il linguaggio corporate.
    `;

      const stream = service.generateStream({
        prompt,
        enableRAG: true,
      });

      // Filter to only get text chunks
      async function* textOnly(source: AsyncGenerator<string | StreamEvent>) {
        for await (const chunk of source) {
          if (typeof chunk === "string") {
            yield chunk;
          }
        }
      }

      const result = await smoothStream(textOnly(stream), {
        delay: 50,
        prefix: "AIt:",
        cursor: "▌",
      });

      assert.ok(result.trim(), "Generated stream text should not be empty");
    },
  );

  it("should work with streaming and conversation history", { timeout: timeout }, async () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "Come ti chiami?" },
      { role: "assistant", content: "Sono Mateo, ma questa è AIt, il mio alter ego digitale." },
    ];

    const prompt = "E di cosa ti occupi?";

    const stream = service.generateStream({
      prompt,
      enableRAG: true,
      messages: messages,
    });

    // Filter to only get text chunks
    async function* textOnly(source: AsyncGenerator<string | StreamEvent>) {
      for await (const chunk of source) {
        if (typeof chunk === "string") {
          yield chunk;
        }
      }
    }

    const result = await smoothStream(textOnly(stream), {
      delay: 50,
      prefix: "AIt:",
      cursor: "▌",
    });

    assert.ok(result.trim(), "Streamed text with history should not be empty");
  });
});
