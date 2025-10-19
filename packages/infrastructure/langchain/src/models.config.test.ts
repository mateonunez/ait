import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getGenerationModel,
  getEmbeddingModel,
  getAvailableModels,
  isModelAvailable,
  getModelSpec,
  GENERATION_MODELS,
  EMBEDDING_MODELS,
  GenerationModels,
  EmbeddingModels,
  Models,
} from "./models.config";

describe("models.config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getGenerationModel", () => {
    it("should return default generation model when no env var is set", () => {
      process.env.GENERATION_MODEL = undefined;
      const model = getGenerationModel();

      assert.strictEqual(model.name, GenerationModels.GPT_OSS_20B);
      assert.strictEqual(model.vectorSize, 4096);
      assert.strictEqual(model.contextWindow, 128000);
      assert.ok(model.description);
    });

    it("should return custom generation model when env var is set", () => {
      process.env.GENERATION_MODEL = GenerationModels.QWEN3;
      const model = getGenerationModel();

      assert.strictEqual(model.name, GenerationModels.QWEN3);
      assert.strictEqual(model.vectorSize, 4096);
      assert.strictEqual(model.contextWindow, 32768);
    });

    it("should override vector size when env var is set", () => {
      process.env.GENERATION_MODEL = GenerationModels.GPT_OSS_20B;
      process.env.GENERATION_VECTOR_SIZE = "8192";
      const model = getGenerationModel();

      assert.strictEqual(model.name, GenerationModels.GPT_OSS_20B);
      assert.strictEqual(model.vectorSize, 8192);
    });

    it("should handle unknown model gracefully", () => {
      process.env.GENERATION_MODEL = "unknown-model:latest";
      const model = getGenerationModel();

      assert.strictEqual(model.name, "unknown-model:latest");
      assert.strictEqual(model.description, "Custom generation model");
      assert.ok(model.vectorSize);
    });

    it("should use custom vector size for unknown model", () => {
      process.env.GENERATION_MODEL = "unknown-model:latest";
      process.env.GENERATION_VECTOR_SIZE = "2048";
      const model = getGenerationModel();

      assert.strictEqual(model.vectorSize, 2048);
    });
  });

  describe("getEmbeddingModel", () => {
    it("should return default embedding model when no env var is set", () => {
      const originalValue = process.env.EMBEDDINGS_MODEL;
      process.env.EMBEDDINGS_MODEL = "";
      const model = getEmbeddingModel();

      assert.ok(model.name);
      assert.ok(model.vectorSize > 0);
      assert.ok(model.description);

      process.env.EMBEDDINGS_MODEL = originalValue;
    });

    it("should return custom embedding model when env var is set", () => {
      process.env.EMBEDDINGS_MODEL = EmbeddingModels.QWEN3_EMBEDDING;
      const model = getEmbeddingModel();

      assert.strictEqual(model.name, EmbeddingModels.QWEN3_EMBEDDING);
      assert.strictEqual(model.vectorSize, 4096);
    });

    it("should override vector size when env var is set", () => {
      process.env.EMBEDDINGS_MODEL = EmbeddingModels.MXBAI_EMBED_LARGE;
      process.env.EMBEDDINGS_VECTOR_SIZE = "2048";
      const model = getEmbeddingModel();

      assert.strictEqual(model.name, EmbeddingModels.MXBAI_EMBED_LARGE);
      assert.strictEqual(model.vectorSize, 2048);
    });

    it("should handle unknown model gracefully", () => {
      process.env.EMBEDDINGS_MODEL = "custom-embeddings:latest";
      const model = getEmbeddingModel();

      assert.strictEqual(model.name, "custom-embeddings:latest");
      assert.strictEqual(model.description, "Custom embedding model");
      assert.ok(model.vectorSize);
    });

    it("should use custom vector size for unknown model", () => {
      process.env.EMBEDDINGS_MODEL = "custom-embeddings:latest";
      process.env.EMBEDDINGS_VECTOR_SIZE = "512";
      const model = getEmbeddingModel();

      assert.strictEqual(model.vectorSize, 512);
    });
  });

  describe("getAvailableModels", () => {
    it("should return all generation models", () => {
      const models = getAvailableModels(Models.GENERATION);

      assert.ok(models.includes(GenerationModels.GPT_OSS_20B));
      assert.ok(models.includes(GenerationModels.QWEN3));
      assert.ok(models.includes(GenerationModels.DEEPSEEK_R1));
      assert.ok(models.length > 0);
    });

    it("should return all embedding models", () => {
      const models = getAvailableModels(Models.EMBEDDING);

      assert.ok(models.includes(EmbeddingModels.MXBAI_EMBED_LARGE));
      assert.ok(models.includes(EmbeddingModels.QWEN3_EMBEDDING));
      assert.ok(models.includes(EmbeddingModels.BGE_M3));
      assert.ok(models.length > 0);
    });
  });

  describe("isModelAvailable", () => {
    it("should return true for available generation models", () => {
      assert.strictEqual(isModelAvailable(GenerationModels.GPT_OSS_20B, Models.GENERATION), true);
      assert.strictEqual(isModelAvailable(GenerationModels.QWEN3, Models.GENERATION), true);
      assert.strictEqual(isModelAvailable(GenerationModels.DEEPSEEK_R1, Models.GENERATION), true);
    });

    it("should return false for unavailable generation models", () => {
      assert.strictEqual(isModelAvailable("unknown-model:latest", Models.GENERATION), false);
      assert.strictEqual(isModelAvailable(EmbeddingModels.MXBAI_EMBED_LARGE, Models.GENERATION), false);
    });

    it("should return true for available embedding models", () => {
      assert.strictEqual(isModelAvailable(EmbeddingModels.MXBAI_EMBED_LARGE, Models.EMBEDDING), true);
      assert.strictEqual(isModelAvailable(EmbeddingModels.QWEN3_EMBEDDING, Models.EMBEDDING), true);
      assert.strictEqual(isModelAvailable(EmbeddingModels.BGE_M3, Models.EMBEDDING), true);
    });

    it("should return false for unavailable embedding models", () => {
      assert.strictEqual(isModelAvailable("unknown-model:latest", Models.EMBEDDING), false);
      assert.strictEqual(isModelAvailable(GenerationModels.GPT_OSS_20B, Models.EMBEDDING), false);
    });
  });

  describe("getModelSpec", () => {
    it("should return spec for generation model", () => {
      const spec = getModelSpec(GenerationModels.GPT_OSS_20B, Models.GENERATION);

      assert.ok(spec);
      assert.strictEqual(spec?.name, GenerationModels.GPT_OSS_20B);
      assert.strictEqual(spec?.vectorSize, 4096);
      assert.strictEqual(spec?.contextWindow, 128000);
      assert.ok(spec?.description);
    });

    it("should return spec for embedding model", () => {
      const spec = getModelSpec(EmbeddingModels.MXBAI_EMBED_LARGE, Models.EMBEDDING);

      assert.ok(spec);
      assert.strictEqual(spec?.name, EmbeddingModels.MXBAI_EMBED_LARGE);
      assert.strictEqual(spec?.vectorSize, 1024);
      assert.ok(spec?.description);
    });

    it("should return undefined for unknown model", () => {
      const spec = getModelSpec("unknown-model:latest", Models.GENERATION);
      assert.strictEqual(spec, undefined);
    });

    it("should return undefined when querying wrong model type", () => {
      const spec = getModelSpec(EmbeddingModels.MXBAI_EMBED_LARGE, Models.GENERATION);
      assert.strictEqual(spec, undefined);
    });
  });

  describe("Model Presets", () => {
    it("should have all required fields for generation models", () => {
      for (const [modelName, spec] of Object.entries(GENERATION_MODELS)) {
        assert.ok(spec.vectorSize > 0, `${modelName} should have positive vectorSize`);
        assert.ok(spec.contextWindow && spec.contextWindow > 0, `${modelName} should have positive contextWindow`);
        assert.ok(spec.description, `${modelName} should have description`);
        assert.strictEqual(typeof spec.description, "string");
      }
    });

    it("should have all required fields for embedding models", () => {
      for (const [modelName, spec] of Object.entries(EMBEDDING_MODELS)) {
        assert.ok(spec.vectorSize > 0, `${modelName} should have positive vectorSize`);
        assert.ok(spec.description, `${modelName} should have description`);
        assert.strictEqual(typeof spec.description, "string");
      }
    });

    it("should have consistent vector sizes across similar models", () => {
      assert.strictEqual(
        GENERATION_MODELS[GenerationModels.GPT_OSS_20B].vectorSize,
        GENERATION_MODELS[GenerationModels.QWEN3].vectorSize,
      );

      const embeddingModels = [EmbeddingModels.MXBAI_EMBED_LARGE, EmbeddingModels.BGE_M3];
      const vectorSizes = embeddingModels.map((name) => EMBEDDING_MODELS[name]?.vectorSize);

      assert.ok(vectorSizes.every((size) => size === 1024));
    });
  });

  describe("Integration", () => {
    it("should work with both generation and embedding configs simultaneously", () => {
      process.env.GENERATION_MODEL = GenerationModels.GPT_OSS_20B;
      process.env.EMBEDDINGS_MODEL = EmbeddingModels.BGE_M3;

      const genModel = getGenerationModel();
      const embModel = getEmbeddingModel();

      assert.strictEqual(genModel.name, GenerationModels.GPT_OSS_20B);
      assert.strictEqual(embModel.name, EmbeddingModels.BGE_M3);
      assert.ok(genModel.vectorSize > 0);
      assert.ok(embModel.vectorSize > 0);
    });

    it("should handle all generation models being available", () => {
      const allModels = getAvailableModels(Models.GENERATION);

      for (const modelName of allModels) {
        const spec = getModelSpec(modelName, Models.GENERATION);
        assert.ok(spec);
        assert.strictEqual(spec?.name, modelName);
      }
    });

    it("should handle all embedding models being available", () => {
      const allModels = getAvailableModels(Models.EMBEDDING);

      for (const modelName of allModels) {
        const spec = getModelSpec(modelName, Models.EMBEDDING);
        assert.ok(spec);
        assert.strictEqual(spec?.name, modelName);
      }
    });
  });
});
