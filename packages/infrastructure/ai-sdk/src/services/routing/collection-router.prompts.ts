import type { CollectionVendor } from "../../config/collections.config";
import { getAllCollections } from "../../config/collections.config";

export function buildCollectionRouterPrompt(
  userQuery: string,
  intentHints?: string[],
  existingVendors?: Set<CollectionVendor>,
): string {
  const allCollections = getAllCollections();
  const collections = existingVendors ? allCollections.filter((c) => existingVendors.has(c.vendor)) : allCollections;

  const collectionDescriptions = collections
    .map((c) => {
      const entityTypesList = c.entityTypes.length > 0 ? c.entityTypes.join(", ") : "general purpose";
      return `- **${c.vendor}** (${c.name}): ${c.description}\n  Entity types: ${entityTypesList}`;
    })
    .join("\n");

  const intentContext =
    intentHints && intentHints.length > 0 ? `\nDetected intent hints: ${intentHints.join(", ")}` : "";

  return `Route this query to relevant collections in a personal knowledge base.

Available Collections:
${collectionDescriptions}

User query: "${userQuery}"${intentContext}

Task:
1. Identify collections with relevant data
2. Assign weights (0.0-1.0): 1.0=primary, 0.7-0.9=highly relevant, 0.4-0.6=context, <0.4=skip
3. Choose strategy based on scope

Special cases:
- Temporal queries ("yesterday"): Consider multiple collections
- Multi-domain ("music while coding"): Multiple collections with weights
- Specific entity ("Spotify playlist"): Focus on that vendor
- Ambiguous: Broader coverage

Return JSON with:
- strategy: "single-collection" | "multi-collection" | "all-collections"
- confidence: 0.0-1.0
- reasoning: Brief explanation
- selectedCollections: [{vendor, weight, reasoning}] (only weight >= 0.4)`;
}

export function buildFallbackRoutingReason(userQuery: string): string {
  return `LLM routing unavailable for query: "${userQuery.slice(0, 100)}". Using heuristic fallback.`;
}
