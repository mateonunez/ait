import type { CollectionConfig } from "../../config/collections.config";
import type { CollectionVendor } from "../../config/collections.config";

export const buildBroadQueryPrompt = (
  userQuery: string,
) => `Determine if this query is broad/ambiguous and should search all collections.

User query: "${userQuery}"

Broad queries:
- Ask for overviews, summaries, or "everything"
- Ask about the system/assistant itself
- Are ambiguous about what information is needed
Examples: "Tell me about you", "What can you do?", "Give me an overview"

Specific queries (NOT broad):
- Target specific data/actions
Examples: "What music did I listen to yesterday?", "Show my GitHub repos"

Return JSON:
{"isBroad": true/false, "confidence": 0.0-1.0, "reasoning": "brief explanation"}

Return ONLY the JSON object.`;

export const buildQueryAdaptationPrompt = (collectionConfig: CollectionConfig, originalQuery: string) => {
  const entityTypesList = collectionConfig.entityTypes.join(", ");
  return `Adapt this user query to be specific for searching ${collectionConfig.description}.

Collection: ${collectionConfig.vendor}
Entity types: ${entityTypesList}
User query: "${originalQuery}"

Task: Rewrite the query to focus on the specific data types in this collection while preserving the user's intent.

Examples:
- "Tell me everything about you" → For Spotify: "my music, tracks, artists, playlists"
- "Tell me everything about you" → For GitHub: "my repositories, pull requests, code"
- "What did I do yesterday?" → For X: "tweets I posted yesterday"

Return a valid JSON object:
{"adaptedQuery": "your adapted query here"}

IMPORTANT: "adaptedQuery" must be 5-200 characters. Return ONLY the JSON object.`;
};

export const buildCollectionRouterPrompt = (
  userQuery: string,
  intentHints: string[],
  existingVendors: Set<CollectionVendor>,
) => {
  const vendorsList = Array.from(existingVendors).join(", ");
  const intentContext = intentHints.length > 0 ? `Intent hints: ${intentHints.join(", ")}` : "";

  return `Select the most relevant data collections for this query.

Available collections: ${vendorsList}
${intentContext}
User query: "${userQuery}"

Task:
1. Analyze the query intent.
2. Select collections that likely contain the answer.
3. Assign a confidence weight (0.0-1.0) to each.

Strategies:
- "single-collection": Clear intent for one source (e.g., "my top songs" -> spotify)
- "multi-collection": Cross-domain intent (e.g., "what was I doing yesterday?" -> spotify, github, x)
- "all-collections": Broad/ambiguous queries

Return JSON:
{
  "strategy": "single-collection" | "multi-collection" | "all-collections",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "selectedCollections": [
    { "vendor": "collection_name", "weight": 0.0-1.0, "reasoning": "why selected" }
  ]
}

Return ONLY the JSON object.`;
};

export const buildFallbackRoutingReason = (userQuery: string): string => {
  return `LLM routing unavailable for query: "${userQuery.slice(0, 100)}". Using heuristic fallback.`;
};
