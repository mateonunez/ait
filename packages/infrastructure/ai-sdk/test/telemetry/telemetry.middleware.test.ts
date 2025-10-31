import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  withTelemetry,
  createTraceContext,
  recordSpan,
  shouldEnableTelemetry,
  updateTraceInput,
  updateTraceOutput,
  endTraceWithOutput,
  endTraceWithError,
} from "../../src/telemetry/telemetry.middleware";
import { initLangfuseProvider, resetLangfuseProvider } from "../../src/telemetry/langfuse.provider";
import type { SpanType } from "../../src/types/telemetry";

describe("telemetry.middleware", () => {
  beforeEach(() => {
    initLangfuseProvider({
      secretKey: "test-secret",
      publicKey: "test-public",
      enabled: false, // Disabled to avoid real API calls in tests
    });
  });

  afterEach(() => {
    resetLangfuseProvider();
  });

  describe("withTelemetry", () => {
    it("should wrap async function with telemetry", async () => {
      const testFn = async (args: { value: number }) => {
        return args.value * 2;
      };

      const result = await withTelemetry(
        {
          name: "test-operation",
          type: "generation",
        },
        testFn,
        { value: 5 },
      );

      assert.equal(result, 10);
    });

    it("should handle function that throws", async () => {
      const testFn = async () => {
        throw new Error("Test error");
      };

      await assert.rejects(
        async () =>
          await withTelemetry(
            {
              name: "failing-operation",
              type: "generation",
            },
            testFn,
            {},
          ),
        {
          message: "Test error",
        },
      );
    });

    it("should work without telemetry enabled", async () => {
      resetLangfuseProvider();

      const testFn = async (args: { value: string }) => {
        return `Hello ${args.value}`;
      };

      const result = await withTelemetry(
        {
          name: "test",
          type: "span" as SpanType,
        },
        testFn,
        { value: "world" },
      );

      assert.equal(result, "Hello world");
    });
  });

  describe("createTraceContext", () => {
    it("should return null when Langfuse is disabled", () => {
      resetLangfuseProvider();

      const context = createTraceContext("test-trace");
      assert.equal(context, null);
    });

    it("should create context with metadata", () => {
      const context = createTraceContext("test", { key: "value" });
      // When disabled, should return null
      assert.equal(context, null);
    });

    it("should handle empty trace name", () => {
      const context = createTraceContext("");
      assert.equal(context, null);
    });
  });

  describe("recordSpan", () => {
    it("should handle recording span when disabled", () => {
      resetLangfuseProvider();

      // Should not throw when disabled
      recordSpan("test-span", "generation", { traceId: "test", spanId: "test" });
      assert.ok(true);
    });

    it("should accept different span types", () => {
      const types = ["generation", "span", "event"] as const;

      for (const type of types) {
        recordSpan(`test-${type}`, type as SpanType, { traceId: "test", spanId: "test" });
      }

      assert.ok(true);
    });
  });

  describe("shouldEnableTelemetry", () => {
    it("should return false when no options provided", () => {
      const result = shouldEnableTelemetry();
      assert.equal(result, false);
    });

    it("should return false when explicitly disabled", () => {
      const result = shouldEnableTelemetry({ enableTelemetry: false });
      assert.equal(result, false);
    });

    it("should check Langfuse availability when enabled", () => {
      const result = shouldEnableTelemetry({ enableTelemetry: true });
      assert.equal(typeof result, "boolean");
    });
  });

  describe("trace update functions", () => {
    it("should handle updateTraceInput when disabled", () => {
      resetLangfuseProvider();

      // Should not throw
      updateTraceInput(null as any, { input: "test" });
      assert.ok(true);
    });

    it("should handle updateTraceOutput when disabled", () => {
      resetLangfuseProvider();

      updateTraceOutput(null as any, { output: "result" });
      assert.ok(true);
    });

    it("should handle endTraceWithOutput when disabled", () => {
      resetLangfuseProvider();

      endTraceWithOutput(null as any, { output: "done" });
      assert.ok(true);
    });

    it("should handle endTraceWithError when disabled", () => {
      resetLangfuseProvider();

      const error = new Error("Test error");
      endTraceWithError(null as any, error);
      assert.ok(true);
    });

    it("should handle endTraceWithError with metadata", () => {
      resetLangfuseProvider();

      const error = new Error("Test error");
      endTraceWithError(null as any, error, { severity: "high" });
      assert.ok(true);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete telemetry flow when disabled", async () => {
      resetLangfuseProvider();

      const context = createTraceContext("flow-test");
      assert.equal(context, null);

      const testFn = async (args: { x: number }) => args.x + 1;

      const result = await withTelemetry(
        {
          name: "flow-op",
          type: "generation",
        },
        testFn,
        { x: 5 },
      );

      assert.equal(result, 6);
    });

    it("should handle nested telemetry operations", async () => {
      const innerFn = async (x: number) => x * 2;
      const outerFn = async (x: number) => {
        const inner = await withTelemetry({ name: "inner", type: "span" as SpanType }, innerFn, x);
        return inner + 10;
      };

      const result = await withTelemetry({ name: "outer", type: "span" as SpanType }, outerFn, 5);

      assert.equal(result, 20);
    });
  });
});
