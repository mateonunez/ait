import { z } from "zod";
import type { CollectionVendor } from "../../config/collections.config";
import { getAllCollections, getCollectionsByEntityTypes } from "../../config/collections.config";
import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES, getVendorKeywords } from "@ait/core";
import type { CollectionRouterResult, CollectionWeight } from "../../types/collections";
import type { QueryIntent } from "./query-intent.service";
import { getAItClient, type AItClient } from "../../client/ai-sdk.client";
import { recordSpan, recordGeneration } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";
import { CollectionDiscoveryService, type ICollectionDiscoveryService } from "../metadata/collection-discovery.service";
import {
  buildBroadQueryPrompt,
  buildCollectionRouterPrompt,
  buildFallbackRoutingReason,
} from "../prompts/routing.prompts";

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

const BroadQuerySchema = z.object({
  isBroad: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

type CollectionRouterResponse = z.infer<typeof CollectionRouterSchema>;
type BroadQueryResponse = z.infer<typeof BroadQuerySchema>;

export class CollectionRouterService implements ICollectionRouterService {
  private readonly _temperature: number;
  private readonly _minConfidenceThreshold: number;
  private readonly _discoveryService: ICollectionDiscoveryService;
  private readonly _client: AItClient;

  constructor(
    config?: { temperature?: number; minConfidenceThreshold?: number },
    discoveryService?: ICollectionDiscoveryService,
    client?: AItClient,
  ) {
    this._temperature = config?.temperature ?? 0.3;
    this._minConfidenceThreshold = config?.minConfidenceThreshold ?? 0.4;
    this._discoveryService = discoveryService || new CollectionDiscoveryService();
    this._client = client || getAItClient();
  }

  private async _getExistingCollectionVendors(): Promise<Set<CollectionVendor>> {
    return this._discoveryService.getExistingCollectionVendors();
  }

  private async _isBroadQuery(userQuery: string, traceContext?: TraceContext): Promise<boolean> {
    try {
      const client = this._client;
      const prompt = buildBroadQueryPrompt(userQuery);

      const response = await client.generateStructured<BroadQueryResponse>({
        schema: BroadQuerySchema,
        temperature: 0.2,
        prompt,
      });

      if (traceContext) {
        recordSpan(
          "broad-query-detection",
          "routing",
          traceContext,
          { query: userQuery.slice(0, 100) },
          {
            isBroad: response.isBroad,
            confidence: response.confidence,
            reasoning: response.reasoning,
          },
        );
      }

      // Consider it broad if LLM says so with confidence >= 0.6
      return response.isBroad && response.confidence >= 0.6;
    } catch (error) {
      console.warn("Failed to detect broad query with LLM, defaulting to false", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async routeCollections(
    userQuery: string,
    queryIntent?: QueryIntent,
    traceContext?: TraceContext,
  ): Promise<CollectionRouterResult> {
    const startTime = Date.now();

    // Check if query is broad/ambiguous - if so, return all existing collections
    const isBroad = await this._isBroadQuery(userQuery, traceContext);
    if (isBroad) {
      const existingVendors = await this._getExistingCollectionVendors();
      if (existingVendors.size > 0) {
        const allCollections = getAllCollections();
        const existingCollections = allCollections.filter((c) => existingVendors.has(c.vendor));

        console.info("Broad query detected, selecting all existing collections", {
          query: userQuery.slice(0, 100),
          collections: Array.from(existingVendors),
        });

        return {
          selectedCollections: existingCollections.map((c) => ({
            vendor: c.vendor,
            weight: c.defaultWeight,
            reasoning: "Broad query - all existing collections",
          })),
          reasoning: "Broad/ambiguous query detected - searching all existing collections",
          strategy: "all-collections",
          confidence: 0.8,
          suggestedEntityTypes: queryIntent?.entityTypes
            ? this.validateEntityTypes(queryIntent.entityTypes)
            : undefined,
        };
      }
    }

    const existingVendors = await this._getExistingCollectionVendors();

    try {
      const intentHints = this.extractIntentHints(queryIntent);
      const prompt = buildCollectionRouterPrompt(userQuery, intentHints, existingVendors);

      const client = this._client;
      const response = await client.generateStructured<CollectionRouterResponse>({
        schema: CollectionRouterSchema,
        temperature: this._temperature,
        prompt,
      });

      const validatedResult = await this.validateAndNormalizeResult(response, queryIntent, existingVendors);

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

      return this.buildHeuristicFallback(userQuery, queryIntent, traceContext, existingVendors);
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

  private async validateAndNormalizeResult(
    response: CollectionRouterResponse,
    queryIntent?: QueryIntent,
    existingVendors?: Set<CollectionVendor>,
  ): Promise<CollectionRouterResult> {
    const allCollections = getAllCollections();
    const validVendors = new Set(allCollections.map((c) => c.vendor));
    const existing = existingVendors || (await this._getExistingCollectionVendors());

    const normalizedCollections: CollectionWeight[] = response.selectedCollections
      .filter((c) => {
        if (!validVendors.has(c.vendor as CollectionVendor)) {
          console.warn(`Invalid vendor in LLM response: ${c.vendor}`);
          return false;
        }
        if (!existing.has(c.vendor as CollectionVendor)) {
          console.warn(`Collection ${c.vendor} does not exist in Qdrant, filtering out`);
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
      console.warn("No valid collections after normalization, using all existing collections");
      return this.buildAllExistingCollectionsFallback(response.reasoning || "No collections met threshold", existing);
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

  private async buildHeuristicFallback(
    userQuery: string,
    queryIntent?: QueryIntent,
    traceContext?: TraceContext,
    existingVendors?: Set<CollectionVendor>,
  ): Promise<CollectionRouterResult> {
    const lowerQuery = userQuery.toLowerCase();
    const existing = existingVendors || (await this._getExistingCollectionVendors());

    const heuristics: Array<{ vendor: CollectionVendor; keywords: readonly string[]; weight: number }> = [
      {
        vendor: "spotify",
        keywords: getVendorKeywords("spotify"),
        weight: 1.0,
      },
      {
        vendor: "github",
        keywords: getVendorKeywords("github"),
        weight: 1.0,
      },
      {
        vendor: "linear",
        keywords: getVendorKeywords("linear"),
        weight: 1.0,
      },
      {
        vendor: "x",
        keywords: getVendorKeywords("x"),
        weight: 1.0,
      },
      {
        vendor: "notion",
        keywords: getVendorKeywords("notion"),
        weight: 1.0,
      },
      {
        vendor: "slack",
        keywords: getVendorKeywords("slack"),
        weight: 1.0,
      },
    ];

    const selectedCollections: CollectionWeight[] = [];

    for (const { vendor, keywords, weight } of heuristics) {
      // Only consider collections that exist
      if (!existing.has(vendor)) {
        continue;
      }

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
        // Only consider collections that exist
        if (!existing.has(collection.vendor)) {
          continue;
        }

        const existingCollection = selectedCollections.find((c) => c.vendor === collection.vendor);
        if (!existingCollection) {
          selectedCollections.push({
            vendor: collection.vendor,
            weight: 0.8,
            reasoning: "Intent-based selection",
          });
        } else if (existingCollection.weight < 0.8) {
          existingCollection.weight = 0.8;
          existingCollection.reasoning = `${existingCollection.reasoning} + intent`;
        }
      }
    }

    if (selectedCollections.length === 0) {
      return this.buildAllExistingCollectionsFallback("No keyword or intent matches", existing);
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

  private buildAllExistingCollectionsFallback(
    reason: string,
    existingVendors: Set<CollectionVendor>,
  ): CollectionRouterResult {
    const allCollections = getAllCollections();
    const existingCollections = allCollections.filter((c) => existingVendors.has(c.vendor));

    return {
      selectedCollections: existingCollections.map((c) => ({
        vendor: c.vendor,
        weight: c.defaultWeight,
        reasoning: "Fallback to all existing collections",
        // Default strategies
      })),
      reasoning: `All existing collections selected: ${reason}`,
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
