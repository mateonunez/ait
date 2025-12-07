import assert from "node:assert";
import { describe, it } from "node:test";
import { z } from "zod";
import { jsonSchemaToZod } from "./mcp.schema.utils";

describe("jsonSchemaToZod", () => {
  it("should convert string", () => {
    const schema = { type: "string", description: "A string" };
    const zodSchema = jsonSchemaToZod(schema);
    const result = zodSchema.safeParse("hello");
    assert.strictEqual(result.success, true);
    assert.strictEqual(zodSchema.description, "A string");
  });

  it("should convert number", () => {
    const schema = { type: "number" };
    const zodSchema = jsonSchemaToZod(schema);
    const result = zodSchema.safeParse(123);
    assert.strictEqual(result.success, true);
  });

  it("should convert boolean", () => {
    const schema = { type: "boolean" };
    const zodSchema = jsonSchemaToZod(schema);
    const result = zodSchema.safeParse(true);
    assert.strictEqual(result.success, true);
  });

  it("should convert array", () => {
    const schema = {
      type: "array",
      items: { type: "string" },
    };
    const zodSchema = jsonSchemaToZod(schema);
    const result = zodSchema.safeParse(["a", "b"]);
    assert.strictEqual(result.success, true);

    // @ts-ignore
    assert.strictEqual(zodSchema.element instanceof z.ZodString, true);
  });

  it("should convert object with required fields", () => {
    const schema = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    };

    const zodSchema = jsonSchemaToZod(schema);

    // Valid
    const res1 = zodSchema.safeParse({ name: "Test", age: 10 });
    assert.strictEqual(res1.success, true);

    // Valid (optional age missing)
    const res2 = zodSchema.safeParse({ name: "Test" });
    assert.strictEqual(res2.success, true);

    // Invalid (required name missing)
    const res3 = zodSchema.safeParse({ age: 10 });
    assert.strictEqual(res3.success, false);
  });

  it("should handle nested objects", () => {
    const schema = {
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
      },
    };

    const zodSchema = jsonSchemaToZod(schema);
    const result = zodSchema.safeParse({ user: { id: "123" } });
    assert.strictEqual(result.success, true);
  });
});
