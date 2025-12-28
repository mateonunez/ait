import { getAItClient } from "../../client/ai-sdk.client";
import type { InferredEntityType } from "../../services/tools/tool-selection";
import { selectToolsForPrompt, selectToolsForVendors } from "../../services/tools/tool-selection";
import type { Tool } from "../../types/tools";
import { inferMcpVendorsSemantically } from "./semantic-vendor-router";

export type ToolRouterInput = {
  prompt: string;
  inferredTypes?: InferredEntityType[];
  tools: Record<string, Tool>;
};
export type ToolRouterResult = ReturnType<typeof selectToolsForPrompt>;

export function routeTools(input: ToolRouterInput): ToolRouterResult {
  return selectToolsForPrompt({
    prompt: input.prompt,
    inferredTypes: input.inferredTypes,
    tools: input.tools,
  });
}

/**
 * Semantic, multilingual router.
 * Uses embeddings to infer vendors when type-based routing is insufficient.
 */
export async function routeToolsAsync(input: ToolRouterInput): Promise<ToolRouterResult> {
  const deterministic = routeTools(input);
  if (deterministic.selectedVendors.length > 0) {
    return deterministic;
  }

  const client = getAItClient();
  const scores = await inferMcpVendorsSemantically({
    prompt: input.prompt,
    embed: (t) => client.embed(t),
  });

  const vendors = new Set(scores.map((s) => s.vendor));
  return selectToolsForVendors({
    tools: input.tools,
    vendors,
    originalToolNames: Object.keys(input.tools),
    reason: "semantic",
  });
}
