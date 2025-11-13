import { z } from "zod";
import type { CollectionVendor, EntityType } from "../../config/collections.config";
import { getAllCollections, getCollectionsByEntityTypes, VALID_ENTITY_TYPES } from "../../config/collections.config";
import type { CollectionRouterResult, CollectionWeight } from "../../types/collections";
import type { QueryIntent } from "./query-intent.service";
import { getAItClient } from "../../client/ai-sdk.client";
import { buildCollectionRouterPrompt, buildFallbackRoutingReason } from "./collection-router.prompts";
import { recordSpan, recordGeneration } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";

export interface ICollectionRouterService {
  routeCollections(
    userQuery: string,
    queryIntent?: QueryIntent,
    traceContext?: TraceContext,
  ): Promise<CollectionRouterResult>;
}

const CollectionRouterSchema = z.object({
  strategy: z.enum(["single-collection", "multi-collection", "all-collections"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  selectedCollections: z.array(
    z.object({
      vendor: z.string(),
      weight: z.number().min(0).max(1),
      reasoning: z.string().optional(),
    }),
  ),
});

type CollectionRouterResponse = z.infer<typeof CollectionRouterSchema>;

export class CollectionRouterService implements ICollectionRouterService {
  private readonly _temperature: number;
  private readonly _minConfidenceThreshold: number;

  constructor(config?: { temperature?: number; minConfidenceThreshold?: number }) {
    this._temperature = config?.temperature ?? 0.3;
    this._minConfidenceThreshold = config?.minConfidenceThreshold ?? 0.4;
  }

  async routeCollections(
    userQuery: string,
    queryIntent?: QueryIntent,
    traceContext?: TraceContext,
  ): Promise<CollectionRouterResult> {
    const startTime = Date.now();
    console.info("Collection routing started", { query: userQuery.slice(0, 100) });

    try {
      const intentHints = this.extractIntentHints(queryIntent);
      const prompt = buildCollectionRouterPrompt(userQuery, intentHints);

      const client = getAItClient();
      const response = await client.generateStructured<CollectionRouterResponse>({
        schema: CollectionRouterSchema,
        temperature: this._temperature,
        prompt,
      });

      const validatedResult = this.validateAndNormalizeResult(response, queryIntent);

      console.info("Collection routing completed (LLM)", {
        strategy: validatedResult.strategy,
        confidence: validatedResult.confidence,
        collectionsCount: validatedResult.selectedCollections.length,
        collections: validatedResult.selectedCollections.map((c) => `${c.vendor}:${c.weight}`).join(", "),
      });

      if (traceContext) {
        recordGeneration(
          traceContext,
          "collection-routing",
          { query: userQuery.slice(0, 100), intentHints },
          {
            strategy: validatedResult.strategy,
            collections: validatedResult.selectedCollections,
            reasoning: validatedResult.reasoning,
          },
          { model: client.generationModelConfig.name, temperature: this._temperature },
        );

        recordSpan(
          "collection-routing",
          "routing",
          traceContext,
          { query: userQuery.slice(0, 100) },
          {
            strategy: validatedResult.strategy,
            confidence: validatedResult.confidence,
            collectionsCount: validatedResult.selectedCollections.length,
            duration: Date.now() - startTime,
          },
        );
      }

      return validatedResult;
    } catch (error) {
      console.warn("LLM collection routing failed, using heuristic fallback", {
        error: error instanceof Error ? error.message : String(error),
      });

      return this.buildHeuristicFallback(userQuery, queryIntent, traceContext);
    }
  }

  private extractIntentHints(queryIntent?: QueryIntent): string[] {
    if (!queryIntent) return [];

    const hints: string[] = [];

    if (queryIntent.entityTypes && queryIntent.entityTypes.length > 0) {
      hints.push(...queryIntent.entityTypes);
    }

    if (queryIntent.isTemporalQuery && queryIntent.timeReference) {
      hints.push(`temporal:${queryIntent.timeReference}`);
    }

    return hints;
  }

  private validateAndNormalizeResult(
    response: CollectionRouterResponse,
    queryIntent?: QueryIntent,
  ): CollectionRouterResult {
    const allCollections = getAllCollections();
    const validVendors = new Set(allCollections.map((c) => c.vendor));

    const normalizedCollections: CollectionWeight[] = response.selectedCollections
      .filter((c) => {
        if (!validVendors.has(c.vendor as CollectionVendor)) {
          console.warn(`Invalid vendor in LLM response: ${c.vendor}`);
          return false;
        }
        return c.weight >= this._minConfidenceThreshold;
      })
      .map((c) => ({
        vendor: c.vendor as CollectionVendor,
        weight: Math.min(Math.max(c.weight, 0), 1),
        reasoning: c.reasoning,
      }))
      .sort((a, b) => b.weight - a.weight);

    if (normalizedCollections.length === 0) {
      console.warn("No valid collections after normalization, using all collections");
      return this.buildAllCollectionsFallback(response.reasoning || "No collections met threshold");
    }

    // Validate and cast entity types
    const suggestedEntityTypes = queryIntent?.entityTypes
      ? this.validateEntityTypes(queryIntent.entityTypes)
      : undefined;

    return {
      selectedCollections: normalizedCollections,
      reasoning: response.reasoning || "LLM-based collection routing",
      strategy: response.strategy || this.inferStrategy(normalizedCollections.length),
      confidence: Math.min(Math.max(response.confidence || 0.5, 0), 1),
      suggestedEntityTypes,
    };
  }

  private buildHeuristicFallback(
    userQuery: string,
    queryIntent?: QueryIntent,
    traceContext?: TraceContext,
  ): CollectionRouterResult {
    const lowerQuery = userQuery.toLowerCase();

    const heuristics: Array<{ vendor: CollectionVendor; keywords: string[]; weight: number }> = [
      {
        vendor: "spotify",
        keywords: ["music", "song", "track", "artist", "album", "playlist", "listening", "played", "spotify"],
        weight: 1.0,
      },
      {
        vendor: "github",
        keywords: ["code", "repo", "repository", "pr", "pull request", "commit", "github", "git"],
        weight: 1.0,
      },
      { vendor: "linear", keywords: ["issue", "task", "ticket", "bug", "project", "linear", "kanban"], weight: 1.0 },
      { vendor: "x", keywords: ["tweet", "twitter", "x.com", "posted", "social", "microblog"], weight: 1.0 },
      { vendor: "notion", keywords: ["notion", "page", "note", "document", "wiki", "knowledge", "docs"], weight: 1.0 },
    ];

    const selectedCollections: CollectionWeight[] = [];

    for (const { vendor, keywords, weight } of heuristics) {
      const matchCount = keywords.filter((kw) => lowerQuery.includes(kw)).length;
      if (matchCount > 0) {
        const adjustedWeight = Math.min(weight * (matchCount / keywords.length) + 0.5, 1.0);
        selectedCollections.push({
          vendor,
          weight: adjustedWeight,
          reasoning: `Keyword match (${matchCount} keywords)`,
        });
      }
    }

    if (queryIntent?.entityTypes && queryIntent.entityTypes.length > 0) {
      const validEntityTypes = this.validateEntityTypes(queryIntent.entityTypes);
      const intentCollections = getCollectionsByEntityTypes(validEntityTypes);
      for (const collection of intentCollections) {
        const existing = selectedCollections.find((c) => c.vendor === collection.vendor);
        if (!existing) {
          selectedCollections.push({
            vendor: collection.vendor,
            weight: 0.8,
            reasoning: "Intent-based selection",
          });
        } else if (existing.weight < 0.8) {
          existing.weight = 0.8;
          existing.reasoning = `${existing.reasoning} + intent`;
        }
      }
    }

    if (selectedCollections.length === 0) {
      return this.buildAllCollectionsFallback("No keyword or intent matches");
    }

    selectedCollections.sort((a, b) => b.weight - a.weight);

    const result: CollectionRouterResult = {
      selectedCollections: selectedCollections.slice(0, 4),
      reasoning: buildFallbackRoutingReason(userQuery),
      strategy: this.inferStrategy(selectedCollections.length),
      confidence: 0.6,
      suggestedEntityTypes: queryIntent?.entityTypes ? this.validateEntityTypes(queryIntent.entityTypes) : undefined,
    };

    console.info("Collection routing completed (heuristic)", {
      strategy: result.strategy,
      confidence: result.confidence,
      collectionsCount: result.selectedCollections.length,
      collections: result.selectedCollections.map((c) => `${c.vendor}:${c.weight.toFixed(2)}`).join(", "),
    });

    if (traceContext) {
      recordSpan(
        "collection-routing-fallback",
        "routing",
        traceContext,
        { query: userQuery.slice(0, 100) },
        {
          strategy: result.strategy,
          confidence: result.confidence,
          collectionsCount: result.selectedCollections.length,
          method: "heuristic",
        },
      );
    }

    return result;
  }

  private buildAllCollectionsFallback(reason: string): CollectionRouterResult {
    const allCollections = getAllCollections();

    return {
      selectedCollections: allCollections.map((c) => ({
        vendor: c.vendor,
        weight: c.defaultWeight,
        reasoning: "Fallback to all collections",
      })),
      reasoning: `All collections selected: ${reason}`,
      strategy: "all-collections",
      confidence: 0.5,
    };
  }

  private inferStrategy(collectionCount: number): CollectionRouterResult["strategy"] {
    if (collectionCount === 1) return "single-collection";
    if (collectionCount <= 3) return "multi-collection";
    return "all-collections";
  }

  private validateEntityTypes(entityTypes: string[]): EntityType[] {
    const validTypesSet = new Set<string>(VALID_ENTITY_TYPES);

    return entityTypes.filter((type): type is EntityType => validTypesSet.has(type));
  }
}
