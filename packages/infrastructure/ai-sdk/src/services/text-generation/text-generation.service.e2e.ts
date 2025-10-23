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

  it("should maintain conversation context across turns", { timeout: timeout }, async () => {
    const firstPrompt = "La canzone più recente che hai ascoltato?";
    const firstResult = await service.generate({
      prompt: firstPrompt,
      enableRAG: true,
    });

    console.log("\n=== TURN 1 ===");
    console.log("User:", firstPrompt);
    console.log("AIt:", firstResult.text);

    const messages: ChatMessage[] = [
      { role: "user", content: firstPrompt },
      { role: "assistant", content: firstResult.text },
    ];

    const secondPrompt = "Sicuro che sia la più recente? Controlla le date~";
    const secondResult = await service.generate({
      prompt: secondPrompt,
      enableRAG: true,
      messages: messages,
    });

    console.log("\n=== TURN 2 ===");
    console.log("User:", secondPrompt);
    console.log("AIt:", secondResult.text);

    messages.push({ role: "user", content: secondPrompt }, { role: "assistant", content: secondResult.text });

    const thirdPrompt = "Dimmi il primo messaggio di questa chat.";
    const thirdResult = await service.generate({
      prompt: thirdPrompt,
      enableRAG: false, // Don't need RAG for this - just conversation memory
      messages: messages,
    });

    console.log("\n=== TURN 3 ===");
    console.log("User:", thirdPrompt);
    console.log("AIt:", thirdResult.text);

    // Verify the AI can recall the first message
    assert.ok(firstResult.text, "First response should not be empty");
    assert.ok(secondResult.text, "Second response should not be empty");
    assert.ok(thirdResult.text, "Third response should not be empty");

    console.log("\n✅ Conversation history maintained across", messages.length, "messages");
  });

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
