import { getLogger } from "@ait/core";
import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES } from "@ait/core";
import { z } from "zod";
import { type AItClient, getAItClient } from "../../client/ai-sdk.client";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { ChatMessage } from "../../types/chat";
import type { TraceContext } from "../../types/telemetry";
import { buildQueryIntentPrompt } from "../prompts/query-intent.prompt";

const logger = getLogger();

const QueryIntentSchema = z.object({
  entityTypes: z.array(z.string<EntityType>()).describe("Entity types relevant to this query"),
  isTemporalQuery: z.boolean().describe("Does this query require correlating entities by time?"),
  timeReference: z.string().optional().describe("Time reference if mentioned"),
  primaryFocus: z.string().describe("Main thing user wants to know"),
  complexityScore: z.number().min(1).max(10).describe("Estimated complexity 1-10"),
  requiredStyle: z
    .enum(["concise", "technical", "creative", "detailed", "conversational"])
    .describe("Best style for the answer"),
  topicShift: z.boolean().describe("Does this query shift the topic from previous context?"),
  needsRAG: z
    .boolean()
    .describe(
      "True if this query needs to retrieve user data from memory/collections. False for greetings, capability questions, simple chat, or questions the AI can answer from training.",
    ),
  needsTools: z
    .boolean()
    .describe(
      "True if query requires external tool execution (API calls, real-time data, actions like playing music, sending messages). False for retrieval, general knowledge, or conversation.",
    ),
});

export type QueryIntent = z.infer<typeof QueryIntentSchema>;
export interface IQueryIntentService {
  analyzeIntent(query: string, messages?: ChatMessage[], traceContext?: TraceContext): Promise<QueryIntent>;
}
export class QueryIntentService implements IQueryIntentService {
  private readonly name = "query-intent";
  private readonly _client: AItClient;

  constructor(client?: AItClient) {
    this._client = client || getAItClient();
  }

  async analyzeIntent(query: string, messages: ChatMessage[] = [], traceContext?: TraceContext): Promise<QueryIntent> {
    const client = this._client;

    const endSpan = traceContext
      ? createSpanWithTiming(this.name, "routing", traceContext, { query: query.slice(0, 100) })
      : null;

    try {
      const intent = await client.generateStructured<QueryIntent>({
        schema: QueryIntentSchema,
        temperature: 0.2, // Lower temperature for more consistent intent extraction
        prompt: buildQueryIntentPrompt(query, messages),
      });

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
        needsRAG: intent.needsRAG,
        needsTools: intent.needsTools,
      };

      const telemetryData = {
        query: query.slice(0, 50),
        needsRAG: result.needsRAG,
        needsTools: result.needsTools,
        entities: normalizedEntityTypes,
        focus: result.primaryFocus.slice(0, 50),
        style: result.requiredStyle,
      };

      if (endSpan) endSpan(telemetryData);

      logger.info(`Service [${this.name}] completed`, telemetryData);

      return result;
    } catch (error) {
      if (endSpan) endSpan({ error: error instanceof Error ? error.message : String(error) });
      logger.error(`Service [${this.name}] failed`, { error, query });

      return {
        entityTypes: [],
        isTemporalQuery: false,
        timeReference: undefined,
        primaryFocus: query,
        complexityScore: 1,
        requiredStyle: "detailed",
        topicShift: false,
        needsRAG: true, // Fallback: assume RAG is needed to be safe
        needsTools: false, // Fallback: don't assume tools are needed
      };
    }
  }
}
