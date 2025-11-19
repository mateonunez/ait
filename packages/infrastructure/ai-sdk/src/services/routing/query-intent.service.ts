import { z } from "zod";
import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES } from "@ait/core";
import { getAItClient, type AItClient } from "../../client/ai-sdk.client";
import { buildQueryIntentPrompt } from "../prompts/query-intent.prompt";

const QueryIntentSchema = z.object({
  entityTypes: z.array(z.string()).describe("Entity types relevant to this query"),
  isTemporalQuery: z.boolean().describe("Does this query require correlating entities by time?"),
  timeReference: z.string().optional().describe("Time reference if mentioned"),
  primaryFocus: z.string().describe("Main thing user wants to know"),
  complexityScore: z.number().min(1).max(10).describe("Estimated complexity 1-10"),
  requiredStyle: z.enum(["concise", "technical", "creative", "detailed"]).describe("Best style for the answer"),
  topicShift: z.boolean().describe("Does this query shift the topic from previous context?"),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;
export interface IQueryIntentService {
  analyzeIntent(query: string): Promise<QueryIntent>;
}
export class QueryIntentService implements IQueryIntentService {
  private readonly _client: AItClient;

  constructor(client?: AItClient) {
    this._client = client || getAItClient();
  }

  async analyzeIntent(query: string): Promise<QueryIntent> {
    const client = this._client;

    try {
      const intent = await client.generateStructured<QueryIntent>({
        schema: QueryIntentSchema,
        temperature: 0.2, // Lower temperature for more consistent intent extraction
        prompt: buildQueryIntentPrompt(query),
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
        complexityScore: intent.complexityScore,
        requiredStyle: intent.requiredStyle,
        topicShift: intent.topicShift,
      };

      console.info("Query intent analyzed", {
        entityTypes: result.entityTypes,
        isTemporalQuery: result.isTemporalQuery,
        primaryFocus: result.primaryFocus.slice(0, 100),
        style: result.requiredStyle,
      });

      return result;
    } catch (error) {
      // ... (error handling remains the same)
      return {
        entityTypes: [],
        isTemporalQuery: false,
        timeReference: undefined,
        primaryFocus: query,
        complexityScore: 1,
        requiredStyle: "detailed",
        topicShift: false,
      };
    }
  }
}
