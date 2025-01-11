import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { TextGenerationService, TextGenerationError } from "./text-generation.service";
import {
  getLangChainClient,
  initLangChainClient,
  DEFAULT_LANGCHAIN_MODEL,
  LANGCHAIN_VECTOR_SIZE,
  resetLangChainClientInstance,
} from "../../langchain.client"; // Ensure initLangChainClient is exported
import type { Ollama, OllamaEmbeddings } from "@langchain/ollama";

describe("TextGenerationService", () => {
  const model = DEFAULT_LANGCHAIN_MODEL;
  const expectedVectorSize = LANGCHAIN_VECTOR_SIZE;
  const prompt = "test prompt";
  const generatedText = "generated response";

  let service: TextGenerationService;
  let mockLLM: sinon.SinonStubbedInstance<Ollama>;
  let createLLMStub: sinon.SinonStub;
  let createEmbeddingsStub: sinon.SinonStub;

  beforeEach(() => {
    initLangChainClient({ model, expectedVectorSize, logger: false });

    mockLLM = {
      invoke: sinon.stub().resolves(generatedText),
      client: {
        embedQuery: sinon.stub(),
      },
      embedQuery: () => Promise.resolve(new Array(expectedVectorSize).fill(0)),
    } as unknown as sinon.SinonStubbedInstance<Ollama>;

    const client = getLangChainClient();

    createLLMStub = sinon.stub(client, "createLLM").returns(mockLLM);
    createEmbeddingsStub = sinon.stub(client, "createEmbeddings").returns({
      model: model,
      baseUrl: "http://localhost:11434",
      client: {
        embedQuery: sinon.stub(),
      },
      embedDocuments: sinon.stub(),
      embedQuery: () => Promise.resolve(new Array(expectedVectorSize).fill(0)),
    } as unknown as OllamaEmbeddings);

    service = new TextGenerationService(model);
  });

  afterEach(() => {
    sinon.restore();
    resetLangChainClientInstance();
  });

  describe("generateText", () => {
    it("should generate text successfully", async () => {
      const result = await service.generateText(prompt);

      assert.strictEqual(result, generatedText);
      assert(createLLMStub.calledOnceWith(model));
      assert(createEmbeddingsStub.calledOnceWith());
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

      assert(createLLMStub.calledOnceWith(DEFAULT_LANGCHAIN_MODEL));
    });

    it("should use provided model when specified", async () => {
      const customModel = "different-model:1b";
      service = new TextGenerationService(customModel);
      await service.generateText(prompt);

      assert(createLLMStub.calledOnceWith(customModel));
    });
  });
});
