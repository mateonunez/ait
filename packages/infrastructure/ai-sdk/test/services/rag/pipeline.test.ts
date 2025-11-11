import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PipelineBuilder } from "../../../src/services/rag/pipeline/pipeline.builder";
import { PipelineOrchestrator } from "../../../src/services/rag/pipeline/pipeline.orchestrator";
import { PipelineStageAbstract } from "../../../src/services/rag/pipeline/pipeline-stage.abstract";
import type { PipelineContext } from "../../../src/services/rag/pipeline/pipeline.types";

describe("Pipeline Architecture", () => {
  // Test stage implementations
  class DoubleStage extends PipelineStageAbstract<number, number> {
    readonly name = "double";

    async execute(input: number, _context: PipelineContext): Promise<number> {
      return input * 2;
    }
  }

  class AddTenStage extends PipelineStageAbstract<number, number> {
    readonly name = "add-ten";

    async execute(input: number, _context: PipelineContext): Promise<number> {
      return input + 10;
    }
  }

  class SquareStage extends PipelineStageAbstract<number, number> {
    readonly name = "square";

    async execute(input: number, _context: PipelineContext): Promise<number> {
      return input * input;
    }
  }

  class StringifyStage extends PipelineStageAbstract<number, string> {
    readonly name = "stringify";

    async execute(input: number, _context: PipelineContext): Promise<string> {
      return `Result: ${input}`;
    }
  }

  class FailingStage extends PipelineStageAbstract<number, number> {
    readonly name = "failing";

    async execute(_input: number, _context: PipelineContext): Promise<number> {
      throw new Error("Stage failed");
    }
  }

  describe("PipelineStageAbstract", () => {
    it("should execute stage with proper context", async () => {
      const stage = new DoubleStage();
      const context: PipelineContext = {
        metadata: { test: "value" },
        state: new Map<string, unknown>(),
        telemetry: {
          recordStage: () => {},
        },
      };

      const result = await stage.execute(5, context);

      assert.equal(result, 10);
    });

    it("should pass context through execution", async () => {
      const stage = new DoubleStage();
      const testData = "test-data";
      const context: PipelineContext = {
        metadata: { testKey: testData },
        state: new Map<string, unknown>(),
        telemetry: {
          recordStage: () => {},
        },
      };

      const result = await stage.execute(5, context);

      assert.equal(result, 10);
      assert.equal(context.metadata.testKey, testData);
    });

    it("should handle errors in execute method", async () => {
      const stage = new FailingStage();
      const context: PipelineContext = {
        metadata: {},
        state: new Map<string, unknown>(),
        telemetry: {
          recordStage: () => {},
        },
      };

      await assert.rejects(async () => await stage.execute(5, context), {
        message: "Stage failed",
      });
    });

    it("should record telemetry when trace context provided", async () => {
      const stage = new DoubleStage();
      const context: PipelineContext = {
        traceContext: {
          traceId: "test-trace-123",
        },
        metadata: {},
        state: new Map<string, unknown>(),
        telemetry: {
          recordStage: () => {},
        },
      };

      const result = await stage.execute(5, context);

      assert.equal(result, 10);
      // Telemetry should be recorded (no errors thrown)
    });
  });

  describe("PipelineOrchestrator", () => {
    it("should execute stages in sequence", async () => {
      const orchestrator = new PipelineOrchestrator({
        stages: [new DoubleStage(), new AddTenStage(), new SquareStage()],
        failureMode: "fail-fast",
        enableTelemetry: false,
      });

      // Input: 5
      // After double: 10
      // After add ten: 20
      // After square: 400
      const result = await orchestrator.execute(5);

      assert.equal(result.data, 400);
      assert.equal(result.success, true);
    });

    it("should pass output between stages", async () => {
      const orchestrator = new PipelineOrchestrator({
        stages: [
          new DoubleStage(), // 5 -> 10
          new DoubleStage(), // 10 -> 20
          new AddTenStage(), // 20 -> 30
        ],
        failureMode: "fail-fast",
        enableTelemetry: false,
      });

      const result = await orchestrator.execute(5);

      assert.equal(result.data, 30);
      assert.equal(result.success, true);
    });

    it("should preserve and update metadata across stages", async () => {
      const orchestrator = new PipelineOrchestrator({
        stages: [new DoubleStage(), new AddTenStage()],
        failureMode: "fail-fast",
        enableTelemetry: false,
      });

      const initialMetadata = { initialValue: 5 };

      const result = await orchestrator.execute(5, {
        metadata: initialMetadata,
      });

      assert.equal(result.data, 20);
      assert.equal(result.success, true);
    });

    it("should handle type transformations between stages", async () => {
      const orchestrator = new PipelineOrchestrator<number, string>({
        stages: [
          new DoubleStage(), // number -> number
          new AddTenStage(), // number -> number
          new StringifyStage(), // number -> string
        ],
        failureMode: "fail-fast",
        enableTelemetry: false,
      });

      const result = await orchestrator.execute(5);

      assert.equal(result.data, "Result: 20");
      assert.equal(result.success, true);
    });

    it("should stop execution on stage failure with fail-fast mode", async () => {
      const orchestrator = new PipelineOrchestrator({
        stages: [
          new DoubleStage(),
          new FailingStage(),
          new AddTenStage(), // Should not execute
        ],
        failureMode: "fail-fast",
        enableTelemetry: false,
      });

      const result = await orchestrator.execute(5);

      assert.equal(result.success, false);
      assert.ok(result.error);
      assert.equal(result.error.message, "Stage failed");
    });

    it("should continue execution on stage failure with continue-on-error mode", async () => {
      const orchestrator = new PipelineOrchestrator({
        stages: [
          new DoubleStage(),
          new FailingStage(),
          new AddTenStage(), // Should still execute
        ],
        failureMode: "continue-on-error",
        enableTelemetry: false,
      });

      const result = await orchestrator.execute(5);

      assert.equal(result.success, true); // Pipeline succeeds even with stage failure
      assert.ok(result.stageResults.some((s) => !s.success)); // But records the failure
    });

    it("should throw error when creating pipeline with no stages", () => {
      assert.throws(
        () =>
          new PipelineOrchestrator({
            stages: [],
            failureMode: "fail-fast",
            enableTelemetry: false,
          }),
        {
          message: "Pipeline must have at least one stage",
        },
      );
    });

    it("should execute with single stage", async () => {
      const orchestrator = new PipelineOrchestrator({
        stages: [new DoubleStage()],
        failureMode: "fail-fast",
        enableTelemetry: false,
      });

      const result = await orchestrator.execute(5);

      assert.equal(result.data, 10);
      assert.equal(result.success, true);
    });
  });

  describe("PipelineBuilder", () => {
    it("should build pipeline with fluent API", () => {
      const pipeline = PipelineBuilder.create().addStage(new DoubleStage()).addStage(new AddTenStage()).build();

      assert.ok(pipeline instanceof PipelineOrchestrator);
    });

    it("should execute built pipeline", async () => {
      const pipeline = PipelineBuilder.create()
        .addStage(new DoubleStage()) // 5 -> 10
        .addStage(new AddTenStage()) // 10 -> 20
        .build();

      const result = await pipeline.execute(5);

      assert.equal(result.data, 20);
      assert.equal(result.success, true);
    });

    it("should allow chaining multiple stages", async () => {
      // Create stages with unique names
      class Double1Stage extends PipelineStageAbstract<number, number> {
        readonly name = "double-1";
        async execute(input: number, _context: PipelineContext): Promise<number> {
          return input * 2;
        }
      }

      class Double2Stage extends PipelineStageAbstract<number, number> {
        readonly name = "double-2";
        async execute(input: number, _context: PipelineContext): Promise<number> {
          return input * 2;
        }
      }

      class Double3Stage extends PipelineStageAbstract<number, number> {
        readonly name = "double-3";
        async execute(input: number, _context: PipelineContext): Promise<number> {
          return input * 2;
        }
      }

      const pipeline = PipelineBuilder.create()
        .addStage(new Double1Stage())
        .addStage(new Double2Stage())
        .addStage(new Double3Stage())
        .build();

      // 5 -> 10 -> 20 -> 40
      const result = await pipeline.execute(5);

      assert.equal(result.data, 40);
      assert.equal(result.success, true);
    });

    it("should support type transformations", async () => {
      const pipeline = PipelineBuilder.create<number, string>()
        .addStage(new DoubleStage())
        .addStage(new AddTenStage())
        .addStage(new StringifyStage())
        .build();

      const result = await pipeline.execute(5);

      assert.equal(result.data, "Result: 20");
      assert.equal(result.success, true);
    });

    it("should allow configuring failure mode", async () => {
      const pipeline = PipelineBuilder.create()
        .addStage(new DoubleStage())
        .addStage(new FailingStage())
        .addStage(new AddTenStage())
        .withFailureMode("continue-on-error")
        .build();

      const result = await pipeline.execute(5);

      assert.equal(result.success, true); // Continues despite failure
    });

    it("should allow enabling/disabling telemetry", async () => {
      const pipeline = PipelineBuilder.create().addStage(new DoubleStage()).withTelemetry(false).build();

      const result = await pipeline.execute(5);

      assert.equal(result.data, 10);
      assert.equal(result.success, true);
    });

    it("should throw error when building empty pipeline", () => {
      assert.throws(() => PipelineBuilder.create().build(), {
        message: "Pipeline must have at least one stage",
      });
    });

    it("should create new builder instance with static method", () => {
      const builder1 = PipelineBuilder.create();
      const builder2 = PipelineBuilder.create();

      assert.notEqual(builder1, builder2);
    });
  });

  describe("Real-world RAG Pipeline Simulation", () => {
    class QueryExpandStage extends PipelineStageAbstract<string, string[]> {
      readonly name = "query-expand";

      async execute(query: string, _context: PipelineContext): Promise<string[]> {
        return [query, `${query} expanded`, `${query} variant`];
      }
    }

    class SearchStage extends PipelineStageAbstract<string[], Array<{ doc: string; score: number }>> {
      readonly name = "search";

      async execute(queries: string[], _context: PipelineContext): Promise<Array<{ doc: string; score: number }>> {
        return queries.map((q, i) => ({
          doc: `Result for: ${q}`,
          score: 0.9 - i * 0.1,
        }));
      }
    }

    class RerankStage extends PipelineStageAbstract<
      Array<{ doc: string; score: number }>,
      Array<{ doc: string; score: number }>
    > {
      readonly name = "rerank";

      async execute(
        results: Array<{ doc: string; score: number }>,
        _context: PipelineContext,
      ): Promise<Array<{ doc: string; score: number }>> {
        return results.sort((a, b) => b.score - a.score);
      }
    }

    it("should execute RAG-style pipeline", async () => {
      const pipeline = PipelineBuilder.create<string, Array<{ doc: string; score: number }>>()
        .addStage(new QueryExpandStage())
        .addStage(new SearchStage())
        .addStage(new RerankStage())
        .build();

      const result = await pipeline.execute("What is AI?");

      assert.ok(Array.isArray(result.data));
      assert.ok(result.data && result.data.length > 0);
      assert.ok(result.data && result.data[0].score >= result.data[result.data.length - 1].score);
      assert.equal(result.success, true);
    });

    it("should pass trace context through RAG pipeline", async () => {
      const pipeline = PipelineBuilder.create<string, Array<{ doc: string; score: number }>>()
        .addStage(new QueryExpandStage())
        .addStage(new SearchStage())
        .addStage(new RerankStage())
        .build();

      const traceContext = {
        traceId: "rag-trace-123",
      };

      const result = await pipeline.execute("What is AI?", {
        traceContext,
        metadata: {},
      });

      assert.ok(result.data);
      assert.equal(result.success, true);
    });
  });

  describe("Pipeline Context Management", () => {
    class ContextWriterStage extends PipelineStageAbstract<number, number> {
      readonly name = "context-writer";

      async execute(input: number, context: PipelineContext): Promise<number> {
        context.state.set("stageExecuted", true);
        context.state.set("inputReceived", input);
        return input * 2;
      }
    }

    class ContextReaderStage extends PipelineStageAbstract<number, number> {
      readonly name = "context-reader";

      async execute(input: number, context: PipelineContext): Promise<number> {
        const previousInput = context.state.get("inputReceived") as number;
        return input + previousInput;
      }
    }

    it("should allow stages to write to context", async () => {
      const pipeline = PipelineBuilder.create().addStage(new ContextWriterStage()).build();

      const result = await pipeline.execute(5);

      assert.equal(result.data, 10);
      assert.equal(result.success, true);
    });

    it("should allow stages to read from context", async () => {
      const pipeline = PipelineBuilder.create()
        .addStage(new ContextWriterStage()) // input: 5, output: 10, state.inputReceived = 5
        .addStage(new ContextReaderStage()) // input: 10, output: 10 + 5 = 15
        .build();

      const result = await pipeline.execute(5);

      assert.equal(result.data, 15);
      assert.equal(result.success, true);
    });

    it("should record stage results", async () => {
      const pipeline = PipelineBuilder.create()
        .addStage(new DoubleStage())
        .addStage(new AddTenStage())
        .withTelemetry(true)
        .build();

      const result = await pipeline.execute(5);

      assert.equal(result.data, 20);
      assert.equal(result.stageResults.length, 2);
      assert.equal(result.stageResults[0].stageName, "double");
      assert.equal(result.stageResults[1].stageName, "add-ten");
      assert.equal(result.success, true);
    });
  });
});
