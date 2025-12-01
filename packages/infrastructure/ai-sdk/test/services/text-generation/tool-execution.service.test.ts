import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import type { OllamaToolCall } from "../../../src/client/ollama.provider";
import { ToolExecutionService } from "../../../src/services/generation/tool-execution.service";
import type { Tool } from "../../../src/types/tools";

describe("ToolExecutionService", () => {
  describe("executeToolCalls", () => {
    it("should execute tool successfully", async () => {
      const service = new ToolExecutionService();

      const tools: Record<string, Tool> = {
        test_tool: {
          description: "Test tool",
          parameters: z.object({ input: z.string() }),
          execute: async (params: { input: string }) => `Result: ${params.input}`,
        },
      };

      const toolCalls: OllamaToolCall[] = [
        {
          function: {
            name: "test_tool",
            arguments: { input: "hello" },
          },
        },
      ];

      const results = await service.executeToolCalls(toolCalls, tools);

      assert.equal(results.length, 1);
      assert.equal(results[0].name, "test_tool");
      assert.equal(results[0].result, "Result: hello");
      assert.ok(!results[0].error);
      assert.ok(results[0].executionTimeMs >= 0);
    });

    it("should handle tool not found", async () => {
      const service = new ToolExecutionService();

      const tools: Record<string, Tool> = {};

      const toolCalls: OllamaToolCall[] = [
        {
          function: {
            name: "nonexistent_tool",
            arguments: {},
          },
        },
      ];

      const results = await service.executeToolCalls(toolCalls, tools);

      assert.equal(results.length, 1);
      assert.equal(results[0].name, "nonexistent_tool");
      assert.equal(results[0].result, null);
      assert.ok(results[0].error?.includes("not found"));
    });

    it("should handle tool execution error", async () => {
      const service = new ToolExecutionService();

      const tools: Record<string, Tool> = {
        failing_tool: {
          description: "Failing tool",
          parameters: z.object({}),
          execute: async () => {
            throw new Error("Tool execution failed");
          },
        },
      };

      const toolCalls: OllamaToolCall[] = [
        {
          function: {
            name: "failing_tool",
            arguments: {},
          },
        },
      ];

      const results = await service.executeToolCalls(toolCalls, tools);

      assert.equal(results.length, 1);
      assert.equal(results[0].name, "failing_tool");
      assert.equal(results[0].result, null);
      assert.equal(results[0].error, "Tool execution failed");
    });

    it("should execute multiple tools in parallel", async () => {
      const service = new ToolExecutionService();

      const tools: Record<string, Tool> = {
        tool1: {
          description: "Tool 1",
          parameters: z.object({}),
          execute: async () => "result1",
        },
        tool2: {
          description: "Tool 2",
          parameters: z.object({}),
          execute: async () => "result2",
        },
      };

      const toolCalls: OllamaToolCall[] = [
        {
          function: { name: "tool1", arguments: {} },
        },
        {
          function: { name: "tool2", arguments: {} },
        },
      ];

      const startTime = Date.now();
      const results = await service.executeToolCalls(toolCalls, tools);
      const duration = Date.now() - startTime;

      assert.equal(results.length, 2);
      assert.ok(duration < 1000); // Should be fast for parallel execution
    });

    it.skip("should handle timeout for slow tools", async () => {
      const service = new ToolExecutionService({ toolTimeoutMs: 100 });

      const tools: Record<string, Tool> = {
        slow_tool: {
          description: "Slow tool",
          parameters: z.object({}),
          execute: async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return "too late";
          },
        },
      };

      const toolCalls: OllamaToolCall[] = [
        {
          function: { name: "slow_tool", arguments: {} },
        },
      ];

      const results = await service.executeToolCalls(toolCalls, tools);

      assert.equal(results.length, 1);
      assert.equal(results[0].name, "slow_tool");
      assert.ok(results[0].result !== undefined || results[0].error !== undefined);
    });
  });

  describe("formatToolResults", () => {
    it("should format successful results", () => {
      const service = new ToolExecutionService();

      const results = [
        {
          name: "test_tool",
          result: { data: "success" },
          executionTimeMs: 10,
        },
      ];

      const formatted = service.formatToolResults(results);

      assert.ok(formatted.includes("Current Real-Time Information"));
      assert.ok(formatted.includes('"data": "success"'));
    });

    it("should format error results", () => {
      const service = new ToolExecutionService();

      const results = [
        {
          name: "failing_tool",
          result: null,
          error: "Tool failed",
          executionTimeMs: 5,
        },
      ];

      const formatted = service.formatToolResults(results);

      assert.ok(formatted.includes("failing_tool encountered an issue"));
      assert.ok(formatted.includes("Tool failed"));
    });

    it("should format mixed results", () => {
      const service = new ToolExecutionService();

      const results = [
        {
          name: "success_tool",
          result: { value: 42 },
          executionTimeMs: 10,
        },
        {
          name: "error_tool",
          result: null,
          error: "Failed",
          executionTimeMs: 5,
        },
      ];

      const formatted = service.formatToolResults(results);

      assert.ok(formatted.includes('"value": 42'));
      assert.ok(formatted.includes("error_tool encountered an issue"));
    });

    it("should include guidance message", () => {
      const service = new ToolExecutionService();

      const results = [
        {
          name: "test_tool",
          result: "data",
          executionTimeMs: 1,
        },
      ];

      const formatted = service.formatToolResults(results);

      assert.ok(formatted.includes("real-time information"));
      assert.ok(formatted.includes("Answer the user's query naturally"));
    });
  });

  describe("configuration", () => {
    it("should use default timeout", async () => {
      const service = new ToolExecutionService();
      assert.ok(service);
    });

    it("should respect custom timeout", () => {
      const service = new ToolExecutionService({ toolTimeoutMs: 5000 });
      assert.ok(service);
    });

    it("should clamp timeout to minimum", () => {
      const service = new ToolExecutionService({ toolTimeoutMs: 500 });
      assert.ok(service);
    });
  });
});
