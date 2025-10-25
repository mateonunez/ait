import { z } from "zod";
import type { OllamaTool } from "../client/ollama.provider";
import type { Tool } from "../types/tools";

export function convertToOllamaTools(tools: Record<string, Tool>): OllamaTool[] {
  return Object.entries(tools).map(([name, tool]) => {
    const schema = (tool as any).inputSchema || (tool as any).parameters;

    if (!schema) {
      throw new Error(`Tool "${name}" missing inputSchema or parameters`);
    }

    const jsonSchema = z.toJSONSchema(schema, {
      target: "openapi-3.0",
      unrepresentable: "any",
    });

    return {
      type: "function" as const,
      function: {
        name,
        description: tool.description,
        parameters: jsonSchema as {
          type: "object";
          properties: Record<string, unknown>;
          required?: string[];
        },
      },
    };
  });
}
