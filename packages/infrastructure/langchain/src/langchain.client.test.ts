import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import sinon from "sinon";
import { getLangChainClient, initLangChainClient, OLLAMA_BASE_URL, LANGCHAIN_MODEL } from "./langchain.client";
import { Ollama, OllamaEmbeddings } from "@langchain/ollama";

describe("LangChain Client", () => {
  describe("createEmbeddings", () => {
    let mockEmbeddings: sinon.SinonStubbedInstance<OllamaEmbeddings>;

    beforeEach(() => {
      mockEmbeddings = {
        model: LANGCHAIN_MODEL,
        baseUrl: OLLAMA_BASE_URL,
        embedQuery: sinon.stub().resolves([]),
        embedDocuments: sinon.stub().resolves([]),
      } as unknown as sinon.SinonStubbedInstance<OllamaEmbeddings>;

      // @ts-expect-error - Stubbing constructor
      sinon.stub(OllamaEmbeddings.prototype, "constructor").returns(mockEmbeddings);

      initLangChainClient({
        model: LANGCHAIN_MODEL,
        expectedVectorSize: 2048,
        baseUrl: OLLAMA_BASE_URL,
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should create embeddings with default model", () => {
      const client = getLangChainClient();
      const embeddings = client.createEmbeddings();
      assert.strictEqual(embeddings.model, LANGCHAIN_MODEL);
      assert.strictEqual(embeddings.baseUrl, OLLAMA_BASE_URL);
    });

    it("should create embeddings with model override", () => {
      const overrideModel = "different-model:1b";
      mockEmbeddings.model = overrideModel;
      const client = getLangChainClient();
      const embeddings = client.createEmbeddings(overrideModel);
      assert.strictEqual(embeddings.model, overrideModel);
      assert.strictEqual(embeddings.baseUrl, OLLAMA_BASE_URL);
    });
  });

  describe("createLLM", () => {
    let mockLLM: sinon.SinonStubbedInstance<Ollama>;

    beforeEach(() => {
      mockLLM = {
        model: LANGCHAIN_MODEL,
        baseUrl: OLLAMA_BASE_URL,
        temperature: 0.5,
        invoke: sinon.stub().resolves(""),
      } as unknown as sinon.SinonStubbedInstance<Ollama>;

      // @ts-expect-error - Stubbing constructor
      sinon.stub(Ollama.prototype, "constructor").returns(mockLLM);

      initLangChainClient({
        model: LANGCHAIN_MODEL,
        expectedVectorSize: 2048,
        baseUrl: OLLAMA_BASE_URL,
      });
    });

    afterEach(() => {
      sinon.restore();
    });

    it("should create LLM with default model", () => {
      const client = getLangChainClient();
      const llm = client.createLLM();
      assert.strictEqual(llm.model, LANGCHAIN_MODEL);
      assert.strictEqual(llm.baseUrl, OLLAMA_BASE_URL);
      assert.strictEqual(llm.temperature, 0.5);
    });

    it("should create LLM with model override", () => {
      const overrideModel = "different-model:1b";
      mockLLM.model = overrideModel;
      const client = getLangChainClient();
      const llm = client.createLLM(overrideModel);
      assert.strictEqual(llm.model, overrideModel);
      assert.strictEqual(llm.baseUrl, OLLAMA_BASE_URL);
      assert.strictEqual(llm.temperature, 0.5);
    });

    it("should create LLM with temperature override", () => {
      const overrideTemperature = 0.75;
      const client = getLangChainClient();
      const llm = client.createLLM(undefined, overrideTemperature);
      assert.strictEqual(llm.model, LANGCHAIN_MODEL);
      assert.strictEqual(llm.baseUrl, OLLAMA_BASE_URL);
      assert.strictEqual(llm.temperature, overrideTemperature);
    });
  });
});
