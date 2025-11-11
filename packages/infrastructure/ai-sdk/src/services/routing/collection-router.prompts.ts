import { getAllCollections } from "../../config/collections.config";

export function buildCollectionRouterPrompt(userQuery: string, intentHints?: string[]): string {
  const collections = getAllCollections();

  const collectionDescriptions = collections
    .map((c) => {
      const entityTypesList = c.entityTypes.length > 0 ? c.entityTypes.join(", ") : "general purpose";
      return `- **${c.vendor}** (${c.name}): ${c.description}\n  Entity types: ${entityTypesList}`;
    })
    .join("\n");

  const intentContext =
    intentHints && intentHints.length > 0 ? `\nDetected intent hints: ${intentHints.join(", ")}` : "";

  return `You are a collection router for a personal knowledge base RAG system. Your task is to analyze the user query and determine which collections should be searched.

## Available Collections

${collectionDescriptions}

## Query Analysis Task

User query: "${userQuery}"${intentContext}

## Instructions

1. Analyze the query to understand what information the user is seeking
2. Identify which collections contain relevant data for this query
3. Assign confidence weights (0.0-1.0) to each relevant collection:
   - 1.0: Extremely relevant, primary focus
   - 0.7-0.9: Highly relevant, should be included
   - 0.4-0.6: Moderately relevant, may provide context
   - 0.0-0.3: Low relevance, skip unless multi-domain query
4. Provide clear reasoning for your selections

## Special Cases

- **Temporal queries** (e.g., "yesterday", "last week"): Consider multiple collections if the time frame could span activities
- **Multi-domain queries** (e.g., "music while coding"): Select multiple collections with appropriate weights
- **Specific entity queries** (e.g., "Spotify playlist"): Focus on the specific vendor's collection
- **Ambiguous queries**: Prefer broader coverage with multiple collections

## Output Requirements

- **strategy**: "single-collection" (one vendor only) | "multi-collection" (2-3 vendors) | "all-collections" (broad/ambiguous)
- **confidence**: Overall confidence in routing decision (0.0-1.0)
- **reasoning**: Brief explanation of why these collections were selected
- **selectedCollections**: Array of {vendor, weight, reasoning} objects. Only include collections with weight >= 0.4

Return a valid JSON object with the exact structure specified above.`;
}

export function buildFallbackRoutingReason(userQuery: string): string {
  return `LLM routing unavailable for query: "${userQuery.slice(0, 100)}". Using heuristic fallback.`;
}
