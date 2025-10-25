import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";
import { initAItClient } from "../../client/ai-sdk.client";
import { smoothStream } from "./utils/stream.utils";
import type { ChatMessage } from "../../types/chat";

describe("AIt Personality Integration (AI SDK)", () => {
  const timeout = 1800000;

  let service: TextGenerationService;

  beforeEach(() => {
    initAItClient({
      generation: { model: "gemma3:latest", temperature: 0.7 },
      embeddings: { model: "mxbai-embed-large:latest" },
      rag: {
        collection: "ait_embeddings_collection",
        strategy: "multi-query",
        maxDocs: 100,
      },
      logger: true,
    });

    service = new TextGenerationService({
      collectionName: "ait_embeddings_collection",
    });
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

      const result = await smoothStream(
        service.generateStream({
          prompt,
          enableRAG: true,
        }),
        {
          delay: 50,
          prefix: "AIt:",
          cursor: "▌",
        },
      );

      console.log("Generated stream text:", result);

      assert.ok(result.trim(), "Generated stream text should not be empty");
    },
  );

  it("should work with streaming and conversation history", { timeout: timeout }, async () => {
    const messages: ChatMessage[] = [
      { role: "user", content: "Come ti chiami?" },
      { role: "assistant", content: "Sono Mateo, ma questa è AIt, il mio alter ego digitale." },
    ];

    const prompt = "E di cosa ti occupi?";

    const result = await smoothStream(
      service.generateStream({
        prompt,
        enableRAG: true,
        messages: messages,
      }),
      {
        delay: 50,
        prefix: "AIt:",
        cursor: "▌",
      },
    );

    console.log("\n=== Streaming with History ===");
    console.log("Result:", result);

    assert.ok(result.trim(), "Streamed text with history should not be empty");
  });
});
