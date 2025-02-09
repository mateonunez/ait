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

    // Create a stubbed LLM with both invoke (non-streaming) and stream (streaming) methods.
    mockLLM = {
      invoke: sinon.stub().resolves(generatedText),
      stream: sinon.stub().returns(
        // Simulate an async iterator yielding a single chunk.
        (async function* () {
          yield generatedText;
        })(),
      ),
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
      format: sinon.stub().resolves(generatedText),
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
      mockPromptTemplate.format.rejects(new Error("LLM error"));

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
      service = new TextGenerationService(); // uses default model
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

  describe("generateTextStream", () => {
    it("should generate stream text successfully", async () => {
      const streamIterator = service.generateTextStream(prompt);
      let result = "";
      for await (const chunk of streamIterator) {
        result += chunk;
      }
      assert.strictEqual(result, generatedText);
      // Ensure that createLLM and ChatPromptTemplate.fromMessages were called
      assert(createLLMStub.called);
      assert(fromMessagesStub.called);
    });

    it("should throw error for empty prompt in stream mode", async () => {
      await assert.rejects(
        async () => {
          const streamIterator = service.generateTextStream("");
          for await (const _chunk of streamIterator) {
            // exhaust the iterator
          }
        },
        (err: unknown) => {
          assert(err instanceof TextGenerationError);
          assert.strictEqual(err.message, "Failed to generate stream text: Prompt cannot be empty");
          return true;
        },
      );
    });

    it("should handle errors during streaming", async () => {
      // @ts-ignore - mock the stream method to throw an error
      mockLLM.stream = sinon.stub().throws(new Error("Streaming error"));
      await assert.rejects(
        async () => {
          const streamIterator = service.generateTextStream(prompt);
          for await (const _chunk of streamIterator) {
            // exhaust the iterator
          }
        },
        (err: unknown) => {
          assert(err instanceof TextGenerationError);
          assert.strictEqual(err.message, "Failed to generate stream text: Streaming error");
          return true;
        },
      );
    });
  });
});
