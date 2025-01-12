import { describe, it, before, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import {
  getLangChainClient,
  initLangChainClient,
  DEFAULT_LANGCHAIN_MODEL,
  LANGCHAIN_VECTOR_SIZE,
} from "../../langchain.client";
import { EmbeddingsService } from "./embeddings.service";
import type { OllamaEmbeddings } from "@langchain/ollama";

describe("EmbeddingsService", () => {
  const ollamaBaseURL = "http://localhost:11434";
  const model = DEFAULT_LANGCHAIN_MODEL;
  const expectedVectorSize = LANGCHAIN_VECTOR_SIZE;
  const text = "sample text";
  let embeddingsService: EmbeddingsService;
  let langChainClientStub: sinon.SinonStub;

  before(() => {
    // Initialize the LangChain client
    initLangChainClient({ baseUrl: ollamaBaseURL });
  });

  beforeEach(() => {
    langChainClientStub = sinon.stub(getLangChainClient(), "createEmbeddings").returns({
      model: model,
      baseUrl: ollamaBaseURL,
      client: {
        embedQuery: sinon.stub(),
      },
      embedDocuments: sinon.stub(),
      embedQuery: () => Promise.resolve(new Array(expectedVectorSize).fill(0)),
    } as unknown as OllamaEmbeddings);
    embeddingsService = new EmbeddingsService(model, expectedVectorSize);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should generate embeddings of expected size", async () => {
    const vectors = await embeddingsService.generateEmbeddings(text);
    assert.strictEqual(vectors.length, expectedVectorSize);
  });

  it("should throw an error if embeddings size is unexpected", async () => {
    langChainClientStub.returns({
      ...langChainClientStub,
      embedQuery: () => Promise.resolve(new Array(expectedVectorSize - 1).fill(0)),
    } as unknown as OllamaEmbeddings);
    try {
      await embeddingsService.generateEmbeddings(text);
    } catch (error: any) {
      assert.strictEqual(error.message, `Unexpected embeddings size: ${expectedVectorSize - 1}`);
    }
  });

  it.skip("should throw an error if embedding generation fails", async () => {
    langChainClientStub.returns({
      ...langChainClientStub,
      embedQuery: () => Promise.reject(new Error("Embedding generation failed")),
    } as unknown as OllamaEmbeddings);
    try {
      await embeddingsService.generateEmbeddings(text);
      throw new Error("Test failed");
    } catch (error: any) {
      assert.strictEqual(error.message, "Embedding generation failed");
    }
  });
});
