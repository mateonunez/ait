import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { TextGenerationService } from "./text-generation.service";
import { initAItClient } from "../../client/ai-sdk.client";
import { smoothStream } from "./utils/stream.utils";

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

  it("should analyze knowledge base with sharp analytical personality and depth", { timeout: timeout }, async () => {
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
  });

  it("should generate text with RAG context", { timeout: timeout }, async () => {
    const prompt = "Quali sono i miei progetti recenti?";

    const result = await service.generate({
      prompt,
      enableRAG: true,
    });

    console.log("Generated text:", result.text);
    console.log("Finish reason:", result.finishReason);

    assert.ok(result.text, "Generated text should not be empty");
  });

  it("should generate text without RAG", { timeout: 30000 }, async () => {
    const prompt = "Dimmi ciao";

    const result = await service.generate({
      prompt,
      enableRAG: false,
    });

    console.log("Generated text (no RAG):", result.text);

    assert.ok(result.text, "Generated text should not be empty");
  });
});
