import assert from "node:assert";
import { describe, it } from "node:test";
import type { getMCPClientManager } from "../../mcp/mcp.client-manager";
import { convertMCPToolToAItTool } from "./mcp.tools";

// We need to access the unexported function or mock around it,
// but since it's internal to mcp.tools.ts, we can't easily test it directly
// without exporting it.
// However, typically in this environment we can edit the file to make it exported
// OR just trust the implementation.
// For verification, I'll export it temporarily or test via behavior if I mock the manager.

// Let's create a test that verifies the behavior by mocking the manager.executeTool
// to check if it receives cleaned params.

describe("convertMCPToolToAItTool - null cleaning", () => {
  it("should remove nulls from params passed to executeTool", async () => {
    const mockManager = {
      executeTool: async (vendor: any, name: any, args: any) => {
        return { success: true, content: [{ type: "text", text: JSON.stringify(args) }] };
      },
    } as unknown as typeof getMCPClientManager extends () => infer R ? R : never;

    const mockTool = {
      name: "test_tool",
      description: "test",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "string" },
          b: { type: "string" },
        },
      },
    };

    const tool = convertMCPToolToAItTool(mockTool as any, "notion", mockManager as any);

    const input = {
      a: "value",
      b: null,
      c: [null, "item", { d: null }],
      e: { f: null, g: "ok" },
    };

    const result = await tool.execute(input);

    // Assertions
    assert.ok(result.success);
    assert.ok(result.data);
    const receivedArgs = JSON.parse(result.data as string);

    assert.strictEqual(receivedArgs.a, "value");
    assert.strictEqual(receivedArgs.b, undefined); // Should be missing or undefined
    assert.ok(!("b" in receivedArgs));

    assert.strictEqual(receivedArgs.c.length, 2);
    assert.strictEqual(receivedArgs.c[0], "item");
    assert.deepStrictEqual(receivedArgs.c[1], {});

    assert.strictEqual(receivedArgs.e.g, "ok");
    assert.ok(!("f" in receivedArgs.e));
  });
});
