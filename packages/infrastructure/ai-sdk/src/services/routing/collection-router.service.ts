import type { EntityType } from "@ait/core";
import { VALID_ENTITY_TYPES, getVendorKeywords } from "@ait/core";
import { getLogger } from "@ait/core";
import { z } from "zod";
import { type AItClient, getAItClient } from "../../client/ai-sdk.client";
import type { CollectionVendor } from "../../config/collections.config";
import { getAllCollections, getCollectionsByEntityTypes } from "../../config/collections.config";
import { createSpanWithTiming, recordGeneration, recordSpan } from "../../telemetry/telemetry.middleware";
import type { CollectionRouterResult, CollectionWeight } from "../../types/collections";
import type { TraceContext } from "../../types/telemetry";
import { buildCollectionRouterPrompt, buildFallbackRoutingReason } from "../prompts/routing.prompts";
import type { QueryIntent } from "./query-intent.service";

const logger = getLogger();

export interface ICollectionRouterService {
  routeCollections(
    userQuery: string,
    queryIntent?: QueryIntent,
    traceContext?: TraceContext,
  ): Promise<CollectionRouterResult>;
}

export interface CollectionRouterConfig {
  temperature?: number;
  minConfidenceThreshold?: number;
  enableLLMRouting?: boolean;
  llmRoutingConfidenceThreshold?: number;
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
  private readonly _enableLLMRouting: boolean;
  private readonly _llmRoutingConfidenceThreshold: number;
  private readonly _client: AItClient;

  constructor(config?: CollectionRouterConfig, client?: AItClient) {
    this._temperature = config?.temperature ?? 0.3;
    this._minConfidenceThreshold = config?.minConfidenceThreshold ?? 0.4;
    this._enableLLMRouting = config?.enableLLMRouting ?? false;
    this._llmRoutingConfidenceThreshold = config?.llmRoutingConfidenceThreshold ?? 0.5;
    this._client = client || getAItClient();
  }

  private _getEnabledCollectionVendors(): Set<CollectionVendor> {
    const allCollections = getAllCollections();
    return new Set(allCollections.map((c) => c.vendor));
  }

  /**
   * Fast heuristic-based broad query detection
   * Replaces expensive LLM call with instant pattern matching
   */
  private _isBroadQueryHeuristic(userQuery: string): boolean {
    const normalized = userQuery.toLowerCase().trim();
    const wordCount = normalized.split(/\s+/).length;

    // Very short queries are often broad
    if (wordCount <= 2) {
      return true;
    }

    // Known broad query patterns
    const broadPatterns = [
      /^(what|who|how)\s+(are|is)\s+(you|ait|this)/i,
      /^(tell|show)\s+me\s+(about\s+)?(yourself|you|everything)/i,
      /^(hello|hi|hey|help)/i,
      /^what\s+can\s+you\s+do/i,
      /^(give|show)\s+me\s+(an?\s+)?overview/i,
      /^summarize\s+(everything|all|my\s+data)/i,
      /everything\s+about/i,
      /all\s+my\s+data/i,
    ];

    // Activity summary patterns - need ALL collections
    const activityPatterns = [
      /summary\s+of\s+(my\s+)?(activity|work|week|month|day)/i,
      /my\s+(weekly|daily|monthly)\s+(activity|report|summary)/i,
      /(what|show).+(i\s+did|my\s+activity|been\s+up\s+to)/i,
      /weekly\s+report/i,
      /activity\s+(from|this|last)\s+(week|month|day)/i,
      /include\s+.*(summary|activity)/i,
      /summarize\s+my\s+(week|month|activity)/i,
    ];

    for (const pattern of broadPatterns) {
      if (pattern.test(normalized)) {
        return true;
      }
    }

    for (const pattern of activityPatterns) {
      if (pattern.test(normalized)) {
        return true;
      }
    }

    return false;
  }

  async routeCollections(
    userQuery: string,
    queryIntent?: QueryIntent,
    traceContext?: TraceContext,
  ): Promise<CollectionRouterResult> {
    const startTime = Date.now();
    const endSpan = traceContext
      ? createSpanWithTiming("collection-routing", "routing", traceContext, {
          query: userQuery.slice(0, 100),
          entityTypes: queryIntent?.entityTypes,
        })
      : null;

    const enabledVendors = this._getEnabledCollectionVendors();

    // Fast heuristic-based broad query detection (no LLM call)
    const isBroad = this._isBroadQueryHeuristic(userQuery);
    if (isBroad) {
      if (enabledVendors.size > 0) {
        const allCollections = getAllCollections();

        logger.info("Broad query detected (heuristic), selecting all enabled collections", {
          query: userQuery.slice(0, 100),
          collections: Array.from(enabledVendors),
        });

        const result: CollectionRouterResult = {
          selectedCollections: allCollections.map((c) => ({
            vendor: c.vendor,
            weight: c.defaultWeight,
            reasoning: "Broad query - all enabled collections",
          })),
          reasoning: "Broad/ambiguous query detected - searching all enabled collections",
          strategy: "all-collections",
          confidence: 0.8,
          suggestedEntityTypes: queryIntent?.entityTypes
            ? this.validateEntityTypes(queryIntent.entityTypes)
            : undefined,
        };

        const duration = Date.now() - startTime;
        if (endSpan) {
          endSpan({
            strategy: result.strategy,
            confidence: result.confidence,
            collectionsCount: result.selectedCollections.length,
            duration,
            method: "heuristic-broad",
          });
        }

        return result;
      }
    }

    // Try heuristic routing first (always fast)
    const heuristicResult = this._buildHeuristicRouting(userQuery, queryIntent, enabledVendors);

    // If heuristics are confident enough OR LLM routing is disabled, use heuristic result
    if (!this._enableLLMRouting || heuristicResult.confidence >= this._llmRoutingConfidenceThreshold) {
      logger.info("Collection routing completed (heuristic)", {
        strategy: heuristicResult.strategy,
        confidence: heuristicResult.confidence,
        collectionsCount: heuristicResult.selectedCollections.length,
        collections: heuristicResult.selectedCollections.map((c) => `${c.vendor}:${c.weight.toFixed(2)}`).join(", "),
      });

      const duration = Date.now() - startTime;
      if (endSpan) {
        endSpan({
          strategy: heuristicResult.strategy,
          confidence: heuristicResult.confidence,
          collectionsCount: heuristicResult.selectedCollections.length,
          duration,
          method: "heuristic",
        });
      }

      if (traceContext) {
        recordSpan(
          "collection-routing-heuristic",
          "routing",
          traceContext,
          { query: userQuery.slice(0, 100) },
          {
            strategy: heuristicResult.strategy,
            confidence: heuristicResult.confidence,
            collectionsCount: heuristicResult.selectedCollections.length,
            method: "heuristic",
          },
        );
      }

      return heuristicResult;
    }

    // Only use LLM if enabled AND heuristics have low confidence
    try {
      const intentHints = this.extractIntentHints(queryIntent);
      const prompt = buildCollectionRouterPrompt(userQuery, intentHints, enabledVendors);

      const client = this._client;
      const response = await client.generateStructured<CollectionRouterResponse>({
        schema: CollectionRouterSchema,
        temperature: this._temperature,
        prompt,
      });

      const validatedResult = this.validateAndNormalizeResult(response, queryIntent, enabledVendors);

      logger.info("Collection routing completed (LLM)", {
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
          new Date(startTime),
        );
      }

      const duration = Date.now() - startTime;
      if (endSpan) {
        endSpan({
          strategy: validatedResult.strategy,
          confidence: validatedResult.confidence,
          collectionsCount: validatedResult.selectedCollections.length,
          duration,
          method: "llm",
        });
      }

      return validatedResult;
    } catch (error) {
      logger.warn("LLM collection routing failed, using heuristic result", {
        error: error instanceof Error ? error.message : String(error),
      });

      const duration = Date.now() - startTime;
      if (endSpan) {
        endSpan({
          strategy: heuristicResult.strategy,
          confidence: heuristicResult.confidence,
          collectionsCount: heuristicResult.selectedCollections.length,
          duration,
          method: "heuristic-fallback",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      return heuristicResult;
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
    enabledVendors?: Set<CollectionVendor>,
  ): CollectionRouterResult {
    const allCollections = getAllCollections();
    const validVendors = new Set(allCollections.map((c) => c.vendor));
    const enabled = enabledVendors || this._getEnabledCollectionVendors();

    const normalizedCollections: CollectionWeight[] = response.selectedCollections
      .filter((c) => {
        if (!validVendors.has(c.vendor as CollectionVendor)) {
          logger.warn(`Invalid vendor in LLM response: ${c.vendor}`);
          return false;
        }
        if (!enabled.has(c.vendor as CollectionVendor)) {
          logger.warn(`Collection ${c.vendor} is not enabled, filtering out`);
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
      logger.warn("No valid collections after normalization, using all enabled collections");
      return this.buildAllEnabledCollectionsFallback(response.reasoning || "No collections met threshold", enabled);
    }

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

  /**
   * Build routing result using fast keyword-based heuristics
   */
  private _buildHeuristicRouting(
    userQuery: string,
    queryIntent?: QueryIntent,
    enabledVendors?: Set<CollectionVendor>,
  ): CollectionRouterResult {
    const lowerQuery = userQuery.toLowerCase();
    const enabled = enabledVendors || new Set<CollectionVendor>();

    const heuristics: Array<{ vendor: CollectionVendor; keywords: readonly string[]; weight: number }> = [
      { vendor: "spotify", keywords: getVendorKeywords("spotify"), weight: 1.0 },
      { vendor: "github", keywords: getVendorKeywords("github"), weight: 1.0 },
      { vendor: "linear", keywords: getVendorKeywords("linear"), weight: 1.0 },
      { vendor: "x", keywords: getVendorKeywords("x"), weight: 1.0 },
      { vendor: "notion", keywords: getVendorKeywords("notion"), weight: 1.0 },
      { vendor: "slack", keywords: getVendorKeywords("slack"), weight: 1.0 },
      { vendor: "google", keywords: getVendorKeywords("google"), weight: 1.0 },
    ];

    const selectedCollections: CollectionWeight[] = [];
    let totalMatches = 0;

    for (const { vendor, keywords, weight } of heuristics) {
      if (!enabled.has(vendor)) {
        continue;
      }

      const matchCount = keywords.filter((kw) => lowerQuery.includes(kw)).length;
      if (matchCount > 0) {
        totalMatches += matchCount;
        const rawWeight = weight * (matchCount / keywords.length) + 0.5;
        selectedCollections.push({
          vendor,
          weight: rawWeight,
          reasoning: `Keyword match (${matchCount} keywords)`,
        });
      }
    }

    // Also consider entity types from query intent
    if (queryIntent?.entityTypes && queryIntent.entityTypes.length > 0) {
      const validEntityTypes = this.validateEntityTypes(queryIntent.entityTypes);
      const intentCollections = getCollectionsByEntityTypes(validEntityTypes);

      for (const collection of intentCollections) {
        if (!enabled.has(collection.vendor)) {
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

    // If no matches, return all enabled collections with lower confidence
    if (selectedCollections.length === 0) {
      return this.buildAllEnabledCollectionsFallback("No keyword or intent matches", enabled);
    }

    // Normalize weights for multi-collection queries to prevent dominance
    const normalizedCollections = this._normalizeWeightsForMultiCollection(selectedCollections);

    normalizedCollections.sort((a, b) => b.weight - a.weight);

    // Calculate confidence based on match quality
    const confidence = Math.min(0.5 + totalMatches * 0.1, 0.9);

    return {
      selectedCollections: normalizedCollections.slice(0, 4),
      reasoning: buildFallbackRoutingReason(userQuery),
      strategy: this.inferStrategy(normalizedCollections.length),
      confidence,
      suggestedEntityTypes: queryIntent?.entityTypes ? this.validateEntityTypes(queryIntent.entityTypes) : undefined,
    };
  }

  private _normalizeWeightsForMultiCollection(collections: CollectionWeight[]): CollectionWeight[] {
    if (collections.length <= 1) {
      return collections.map((c) => ({ ...c, weight: Math.min(c.weight, 1.0) }));
    }

    const maxWeightRatio = 0.7;
    const maxWeight = collections.length === 2 ? 0.8 : maxWeightRatio;

    return collections.map((c) => ({
      ...c,
      weight: Math.min(c.weight, maxWeight),
    }));
  }

  private buildAllEnabledCollectionsFallback(
    reason: string,
    enabledVendors: Set<CollectionVendor>,
  ): CollectionRouterResult {
    const allCollections = getAllCollections();
    const enabledCollections = allCollections.filter((c) => enabledVendors.has(c.vendor));

    return {
      selectedCollections: enabledCollections.map((c) => ({
        vendor: c.vendor,
        weight: c.defaultWeight,
        reasoning: "Fallback to all enabled collections",
      })),
      reasoning: `All enabled collections selected: ${reason}`,
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
