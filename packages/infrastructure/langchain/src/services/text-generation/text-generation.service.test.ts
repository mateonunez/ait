import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { TextGenerationService, TextGenerationError } from "./text-generation.service";
import { getLangChainClient } from "../../langchain.client";
import type { Ollama } from "@langchain/ollama";
import { EmbeddingsService } from "../embeddings/embeddings.service";

describe("TextGenerationService", () => {
  const model = "gemma:2b";
  const expectedVectorSize = 2048;
  const prompt = "test prompt";
  const generatedText = "generated response";

  let service: TextGenerationService;
  let mockLLM: sinon.SinonStubbedInstance<Ollama>;
  let mockEmbeddingsService: sinon.SinonStubbedInstance<EmbeddingsService>;
  let getLangChainClientStub: sinon.SinonStub;

  beforeEach(() => {
    mockLLM = {
      invoke: sinon.stub().resolves(generatedText),
    } as unknown as sinon.SinonStubbedInstance<Ollama>;

    getLangChainClientStub = sinon.stub(getLangChainClient(), "createLLM").returns(mockLLM);

    mockEmbeddingsService = {
      generateEmbeddings: sinon.stub().resolves([]),
    } as unknown as sinon.SinonStubbedInstance<EmbeddingsService>;

    // @ts-expect-error - Stubbing constructor
    sinon.stub(EmbeddingsService.prototype, "constructor").returns(mockEmbeddingsService);

    service = new TextGenerationService(model, expectedVectorSize);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      const result = await service.generateText(prompt);

      assert.strictEqual(result, generatedText);
      assert.strictEqual(mockLLM.invoke.calledOnceWith(prompt), true);
      assert.strictEqual(getLangChainClientStub.calledOnceWith(model), true);
    });

    it("should throw TextGenerationError when text generation fails", async () => {
      const errorMessage = "LLM error";
      mockLLM.invoke.rejects(new Error(errorMessage));

      try {
        await service.generateText(prompt);
        assert.fail("Expected error to be thrown");
      } catch (error) {
        assert(error instanceof TextGenerationError);
        assert.strictEqual(error.message, `Failed to generate text: ${errorMessage}`);
      }
    });

    it("should use default model when not provided", async () => {
      service = new TextGenerationService();
      await service.generateText(prompt);

      assert.strictEqual(getLangChainClientStub.calledOnceWith("gemma:2b"), true);
    });

    it("should use provided model when specified", async () => {
      const customModel = "different-model:1b";
      service = new TextGenerationService(customModel);
      await service.generateText(prompt);

      assert.strictEqual(getLangChainClientStub.calledOnceWith(customModel), true);
    });
  });
});
