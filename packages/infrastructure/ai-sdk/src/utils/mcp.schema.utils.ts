import { z } from "zod";

/**
 * Converts a JSON Schema object to a Zod schema.
 *
 * This is a simplified implementation focused on the subset of JSON Schema
 * commonly used by MCP tools.
 */
export function jsonSchemaToZod(schema: any): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") {
    return z.any();
  }

  // Handle 'type'
  switch (schema.type) {
    case "string":
      if (schema.enum) {
        return z.enum(schema.enum as [string, ...string[]]).describe(schema.description || "");
      }
      return z.string().describe(schema.description || "");

    case "number":
    case "integer":
      return z.number().describe(schema.description || "");

    case "boolean":
      return z.boolean().describe(schema.description || "");

    case "array":
      if (schema.items) {
        return z.array(jsonSchemaToZod(schema.items)).describe(schema.description || "");
      }
      return z.array(z.any()).describe(schema.description || "");

    case "object": {
      const shape: Record<string, z.ZodTypeAny> = {};
      const required = new Set(Array.isArray(schema.required) ? schema.required : []);

      if (schema.properties) {
        for (const [key, value] of Object.entries(schema.properties)) {
          const fieldSchema = jsonSchemaToZod(value);
          shape[key] = required.has(key) ? fieldSchema : fieldSchema.optional();
        }
      }

      return z.object(shape).describe(schema.description || "");
    }

    default:
      // Fallback for unknown types or mixed types
      return z.any().describe(schema.description || "");
  }
}
