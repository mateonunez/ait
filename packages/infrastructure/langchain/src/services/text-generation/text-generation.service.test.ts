import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { TextGenerationService, TextGenerationError } from "./text-generation.service";
import { QdrantVectorStore } from "@langchain/qdrant";
import {
  getLangChainClient,
  initLangChainClient,
  DEFAULT_LANGCHAIN_MODEL,
  LANGCHAIN_VECTOR_SIZE,
  resetLangChainClientInstance,
} from "../../langchain.client";
import type { Ollama, OllamaEmbeddings } from "@langchain/ollama";
import type { IEmbeddingsService } from "../embeddings/embeddings.service";
import { ChatPromptTemplate } from "@langchain/core/prompts";

describe("TextGenerationService", () => {
  const model = DEFAULT_LANGCHAIN_MODEL;
  const expectedVectorSize = LANGCHAIN_VECTOR_SIZE;
  const prompt = "test prompt";
  const generatedText = "generated response";

  let service: TextGenerationService;

  let mockLLM: sinon.SinonStubbedInstance<Ollama>;
  let mockVectorStore: sinon.SinonStubbedInstance<QdrantVectorStore>;
  let mockEmbeddingsService: sinon.SinonStubbedInstance<IEmbeddingsService>;
  let mockPromptTemplate: sinon.SinonStubbedInstance<ChatPromptTemplate>;

  let fromMessagesStub: sinon.SinonStub;
  let fromExistingCollectionStub: sinon.SinonStub;
  let createLLMStub: sinon.SinonStub;
  let createEmbeddingsStub: sinon.SinonStub;

  beforeEach(() => {
    mockEmbeddingsService = {
      generateEmbeddings: sinon.stub().resolves(new Array(expectedVectorSize).fill(0)),
    } as unknown as sinon.SinonStubbedInstance<IEmbeddingsService>;

    initLangChainClient({ model, expectedVectorSize, logger: false });

    mockLLM = {
      invoke: sinon.stub().resolves(generatedText),
      pipe: sinon.stub().returnsThis(),
    } as unknown as sinon.SinonStubbedInstance<Ollama>;

    mockVectorStore = {
      similaritySearch: sinon.stub().resolves([{ pageContent: "test content", metadata: {} }]),
    } as unknown as sinon.SinonStubbedInstance<QdrantVectorStore>;

    fromExistingCollectionStub = sinon.stub(QdrantVectorStore, "fromExistingCollection").resolves(mockVectorStore);

    const client = getLangChainClient();
    createLLMStub = sinon.stub(client, "createLLM").returns(mockLLM);
    createEmbeddingsStub = sinon.stub(client, "createEmbeddings").returns({
      embedDocuments: sinon.stub(),
      embedQuery: () => Promise.resolve(new Array(expectedVectorSize).fill(0)),
    } as unknown as OllamaEmbeddings);

    mockPromptTemplate = {
      pipe: sinon.stub().returnsThis(),
      invoke: sinon.stub().resolves(generatedText),
    } as unknown as sinon.SinonStubbedInstance<ChatPromptTemplate>;
    fromMessagesStub = sinon.stub(ChatPromptTemplate, "fromMessages").returns(mockPromptTemplate);

    service = new TextGenerationService(model, expectedVectorSize, "langchain", mockEmbeddingsService);
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
      assert(fromExistingCollectionStub.calledOnce);
      assert(mockVectorStore.similaritySearch.calledOnce);
      assert(fromMessagesStub.calledOnce);
      assert(mockPromptTemplate.pipe.calledOnce);
    });

    it("should throw error for empty prompt", async () => {
      await assert.rejects(
        async () => {
          await service.generateText("");
        },
        (err: unknown) => {
          assert(err instanceof TextGenerationError);
          assert.strictEqual(err.message, "Failed to generate text: Prompt cannot be empty");
          return true;
        },
      );
    });

    it("should handle vector store errors", async () => {
      mockVectorStore.similaritySearch.rejects(new Error("Vector store error"));

      await assert.rejects(
        async () => {
          await service.generateText(prompt);
        },
        (err: unknown) => {
          assert(err instanceof TextGenerationError);
          assert.strictEqual(err.message, "Failed to generate text: Vector store error");
          return true;
        },
      );
    });

    it("should handle LLM or chain errors", async () => {
      mockPromptTemplate.invoke.rejects(new Error("LLM error"));

      await assert.rejects(
        async () => {
          await service.generateText(prompt);
        },
        (err: unknown) => {
          assert(err instanceof TextGenerationError);
          assert.strictEqual(err.message, "Failed to generate text: LLM error");
          return true;
        },
      );
    });

    it("should use default model when not provided", async () => {
      service = new TextGenerationService(); // uses default
      await service.generateText(prompt);
      assert(createLLMStub.calledWith(DEFAULT_LANGCHAIN_MODEL));
    });

    it("should use provided model when specified", async () => {
      const customModel = "different-model:1b";
      service = new TextGenerationService(customModel, expectedVectorSize, "langchain", mockEmbeddingsService);
      await service.generateText(prompt);
      assert(createLLMStub.calledWith(customModel));
    });
  });
});
