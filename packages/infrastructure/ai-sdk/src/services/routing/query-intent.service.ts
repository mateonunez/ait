import { z } from "zod";
import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES, getEntityDescriptions } from "@ait/core";
import { getAItClient } from "../../client/ai-sdk.client";

const QueryIntentSchema = z.object({
  entityTypes: z.array(z.string()).describe("Entity types relevant to this query"),
  isTemporalQuery: z.boolean().describe("Does this query require correlating entities by time?"),
  timeReference: z.string().optional().describe("Time reference if mentioned"),
  primaryFocus: z.string().describe("Main thing user wants to know"),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;

export interface IQueryIntentService {
  analyzeIntent(query: string): Promise<QueryIntent>;
}

/**
 * LLM-based service to understand query intent and entity requirements
 * Follows the HyDEService pattern: use LLM intelligence instead of hardcoded rules
 */
export class QueryIntentService implements IQueryIntentService {
  async analyzeIntent(query: string): Promise<QueryIntent> {
    const client = getAItClient();

    try {
      const intent = await client.generateStructured<QueryIntent>({
        schema: QueryIntentSchema,
        temperature: 0.3, // Lower temperature for more consistent intent extraction
        prompt: this._buildIntentPrompt(query),
      });

      // Validate and normalize entity types using centralized config
      const normalizedEntityTypes = intent.entityTypes
        .map((type) => type.toLowerCase().replace(/[_\s-]/g, "_"))
        .filter((type): type is EntityType => VALID_ENTITY_TYPES.includes(type as EntityType));

      const result = {
        entityTypes: normalizedEntityTypes,
        isTemporalQuery: intent.isTemporalQuery,
        timeReference: intent.timeReference,
        primaryFocus: intent.primaryFocus,
      };

      console.info("Query intent analyzed", {
        entityTypes: result.entityTypes,
        isTemporalQuery: result.isTemporalQuery,
        timeReference: result.timeReference,
        primaryFocus: result.primaryFocus.slice(0, 100),
      });

      return result;
    } catch (error) {
      console.error("Failed to analyze query intent", {
        error: error instanceof Error ? error.message : String(error),
        query: query.slice(0, 100),
      });

      // Fallback to simple intent
      return {
        entityTypes: [],
        isTemporalQuery: false,
        timeReference: undefined,
        primaryFocus: query,
      };
    }
  }

  private _buildIntentPrompt(query: string): string {
    return [
      "Analyze this user query and extract structured intent.",
      "",
      "Entity types available:",
      getEntityDescriptions(),
      "",
      "IMPORTANT DISTINCTION:",
      "- Use 'recently_played' when the user asks about what they WERE LISTENING TO, PLAYED, or music DURING an activity",
      "- Use 'track/artist/playlist/album' when asking about library, favorites, or general music preferences",
      "",
      "Your task:",
      "1. Identify which entity types are relevant to this query",
      "2. Determine if this is a temporal query (needs to correlate entities by their timestamps)",
      "3. Extract any time reference mentioned",
      "4. Understand what the user primarily wants to know",
      "",
      "Examples:",
      "",
      "Query: 'What was I listening to while tweeting last week?'",
      "Response:",
      JSON.stringify(
        {
          entityTypes: ["tweet", "recently_played"],
          isTemporalQuery: true,
          timeReference: "last week",
          primaryFocus: "songs played while tweeting",
        },
        null,
        2,
      ),
      "",
      "Query: 'Show me my favorite Spotify tracks'",
      "Response:",
      JSON.stringify(
        {
          entityTypes: ["track"],
          isTemporalQuery: false,
          primaryFocus: "favorite tracks in library",
        },
        null,
        2,
      ),
      "",
      "Query: 'What was I doing on October 30?'",
      "Response:",
      JSON.stringify(
        {
          entityTypes: ["tweet", "recently_played", "pull_request", "issue"],
          isTemporalQuery: true,
          timeReference: "October 30",
          primaryFocus: "all activities on that date",
        },
        null,
        2,
      ),
      "",
      "Now analyze this query:",
      query,
    ].join("\n");
  }
}
