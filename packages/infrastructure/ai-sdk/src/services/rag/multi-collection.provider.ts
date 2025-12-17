import { getLogger } from "@ait/core";
import type { EntityType } from "@ait/core";
import type { CollectionVendor } from "../../config/collections.config";
import { getCollectionConfig } from "../../config/collections.config";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { CollectionSearchResult, CollectionWeight, MultiCollectionSearchResult } from "../../types/collections";
import type { BaseMetadata, Document } from "../../types/documents";
import type { TraceContext } from "../../types/telemetry";
import { QdrantProvider } from "./qdrant.provider";

const logger = getLogger();

export interface MultiCollectionProviderConfig {
  url?: string;
  embeddingsModel?: string;
  expectedVectorSize?: number;
  enableTelemetry?: boolean;
}

/**
 * MultiCollectionProvider is a **pure vector search fetcher**.
 * It executes searches across multiple Qdrant collections.
 * Query adaptation, planning, and collection discovery are handled by upstream stages.
 */
export class MultiCollectionProvider {
  private readonly _providers: Map<CollectionVendor, QdrantProvider>;
  private readonly _config: MultiCollectionProviderConfig;

  constructor(config?: MultiCollectionProviderConfig) {
    this._config = config || {};
    this._providers = new Map();
  }

  private _getOrCreateProvider(vendor: CollectionVendor): QdrantProvider {
    let provider = this._providers.get(vendor);

    if (!provider) {
      const collectionConfig = getCollectionConfig(vendor);

      provider = new QdrantProvider({
        url: this._config.url,
        collectionName: collectionConfig.name,
        embeddingsModel: this._config.embeddingsModel,
        expectedVectorSize: this._config.expectedVectorSize,
        enableTelemetry: this._config.enableTelemetry,
      });

      this._providers.set(vendor, provider);
      logger.debug(`Created QdrantProvider for collection: ${collectionConfig.name}`);
    }

    return provider;
  }

  private _filterTypesForCollection(vendor: CollectionVendor, types?: string[]): { types: string[] } | undefined {
    if (!types || types.length === 0) {
      return undefined;
    }

    const collectionConfig = getCollectionConfig(vendor);
    const collectionEntityTypes = new Set(collectionConfig.entityTypes);

    const filteredTypes = types.filter((type) => collectionEntityTypes.has(type as EntityType));

    if (filteredTypes.length === 0) {
      return undefined;
    }

    // Return filter with only matching types
    return { types: filteredTypes };
  }

  private _handleSearchError(vendor: CollectionVendor, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Not Found") || errorMessage.includes("not found")) {
      logger.warn(`Collection ${vendor} does not exist in Qdrant`, {
        collection: vendor,
        error: errorMessage,
      });
    } else {
      logger.error(`Search failed for collection ${vendor}`, {
        error: errorMessage,
      });
    }
  }

  async searchAcrossCollections<TMetadata extends BaseMetadata = BaseMetadata>(
    query: string,
    collections: CollectionWeight[],
    limit: number,
    traceContext?: TraceContext,
  ): Promise<MultiCollectionSearchResult<TMetadata>> {
    const startTime = Date.now();
    const results: CollectionSearchResult<TMetadata>[] = [];
    let totalDocuments = 0;
    let queriesExecuted = 0;

    if (collections.length === 0) {
      logger.warn("No collections provided for search", {
        query: query.slice(0, 100),
      });
      return {
        results: [],
        totalDocuments: 0,
        totalDuration: Date.now() - startTime,
        queriesExecuted: 0,
      };
    }

    const searchPromises = collections.map(async (collectionWeight) => {
      const searchStartTime = Date.now();

      try {
        const provider = this._getOrCreateProvider(collectionWeight.vendor);
        const collectionLimit = Math.ceil(limit * collectionWeight.weight);

        logger.debug(`Searching ${collectionWeight.vendor}`, {
          weight: collectionWeight.weight,
          limit: collectionLimit,
        });

        const documents = await provider.similaritySearch(query, collectionLimit, {
          enableTelemetry: this._config.enableTelemetry,
          traceContext,
        });

        const searchDuration = Date.now() - searchStartTime;

        logger.debug(`Search completed for ${collectionWeight.vendor}`, {
          documentsFound: documents.length,
          duration: searchDuration,
        });

        return {
          vendor: collectionWeight.vendor,
          documents: documents as Document<TMetadata>[],
          searchDuration,
          totalResults: documents.length,
        };
      } catch (error) {
        this._handleSearchError(collectionWeight.vendor, error);

        return {
          vendor: collectionWeight.vendor,
          documents: [] as Document<TMetadata>[],
          searchDuration: Date.now() - searchStartTime,
          totalResults: 0,
        };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    for (const result of searchResults) {
      if (result.documents.length > 0) {
        results.push(result);
        totalDocuments += result.totalResults;
        queriesExecuted++;
      }
    }

    const totalDuration = Date.now() - startTime;
    if (traceContext) {
      const endSpan = createSpanWithTiming("multi-collection-search", "search", traceContext, {
        query: query.slice(0, 100),
        collections: collections.map((c) => c.vendor),
      });
      if (endSpan) {
        endSpan({
          totalDocuments,
          queriesExecuted,
          collectionsQueried: results.length,
          duration: totalDuration,
          resultsByCollection: results.map((r) => ({
            vendor: r.vendor,
            documentCount: r.totalResults,
            duration: r.searchDuration,
          })),
        });
      }
    }

    return {
      results,
      totalDocuments,
      totalDuration,
      queriesExecuted,
    };
  }

  async searchAcrossCollectionsWithScore<TMetadata extends BaseMetadata = BaseMetadata>(
    query: string,
    collections: CollectionWeight[],
    limit: number,
    scoreThreshold?: number,
    filter?: { types?: string[]; timeRange?: { from?: string; to?: string } },
    traceContext?: TraceContext,
  ): Promise<Array<{ vendor: CollectionVendor; documents: Array<[Document<TMetadata>, number]> }>> {
    const startTime = Date.now();

    if (collections.length === 0) {
      logger.warn("No collections provided for search", {
        query: query.slice(0, 100),
      });
      return [];
    }

    // First attempt: search with filters
    let results = await this._executeSearchAcrossCollections<TMetadata>(
      query,
      collections,
      limit,
      scoreThreshold,
      filter,
      traceContext,
    );

    // Fallback: if no results and we have a time filter, retry without it
    const totalDocuments = results.reduce((sum, r) => sum + r.documents.length, 0);
    if (totalDocuments === 0 && filter?.timeRange) {
      logger.warn("No results with time filter, retrying without time constraints...", {
        originalTimeRange: filter.timeRange,
        query: query.slice(0, 50),
      });

      const filterWithoutTime = filter.types ? { types: filter.types } : undefined;
      results = await this._executeSearchAcrossCollections<TMetadata>(
        query,
        collections,
        limit,
        scoreThreshold,
        filterWithoutTime,
        traceContext,
      );
    }

    if (traceContext) {
      const endSpan = createSpanWithTiming("multi-collection-search-with-score", "search", traceContext, {
        query: query.slice(0, 100),
        collections: collections.map((c) => c.vendor),
      });
      if (endSpan) {
        endSpan({
          duration: Date.now() - startTime,
          collectionsQueried: results.length,
          totalDocuments: results.reduce((sum, r) => sum + r.documents.length, 0),
          retriedWithoutTimeFilter: totalDocuments === 0 && filter?.timeRange !== undefined,
        });
      }
    }

    return results;
  }

  private async _executeSearchAcrossCollections<TMetadata extends BaseMetadata = BaseMetadata>(
    query: string,
    filteredCollections: CollectionWeight[],
    limit: number,
    scoreThreshold?: number,
    filter?: { types?: string[]; timeRange?: { from?: string; to?: string } },
    traceContext?: TraceContext,
  ): Promise<Array<{ vendor: CollectionVendor; documents: Array<[Document<TMetadata>, number]> }>> {
    const searchPromises = filteredCollections.map(async (collectionWeight) => {
      try {
        const provider = this._getOrCreateProvider(collectionWeight.vendor);
        const collectionLimit = Math.ceil(limit * collectionWeight.weight);

        // Filter types to only include those that exist in this collection
        const typeFilterResult = this._filterTypesForCollection(collectionWeight.vendor, filter?.types);
        const collectionFilter = filter
          ? {
              ...(typeFilterResult || {}),
              timeRange: filter.timeRange,
            }
          : undefined;

        // If filter becomes empty after filtering types, remove it entirely
        const effectiveFilter =
          collectionFilter && (!collectionFilter.types || collectionFilter.types.length === 0)
            ? collectionFilter.timeRange
              ? { timeRange: collectionFilter.timeRange }
              : undefined
            : collectionFilter;

        // Log when types are filtered out
        if (
          filter?.types &&
          filter.types.length > 0 &&
          (!effectiveFilter?.types || effectiveFilter.types.length === 0)
        ) {
          logger.debug(
            `No matching entity types for collection ${collectionWeight.vendor}, searching without type filter`,
            {
              collection: collectionWeight.vendor,
              requestedTypes: filter.types,
              collectionEntityTypes: getCollectionConfig(collectionWeight.vendor).entityTypes,
            },
          );
        } else if (filter?.types && effectiveFilter?.types && filter.types.length !== effectiveFilter.types.length) {
          logger.debug(`Filtered types for collection ${collectionWeight.vendor}`, {
            collection: collectionWeight.vendor,
            requestedTypes: filter.types,
            filteredTypes: effectiveFilter.types,
            removedTypes: filter.types.filter((t) => !effectiveFilter.types?.includes(t)),
          });
        }

        const documents = await provider.similaritySearchWithScore(
          query,
          collectionLimit,
          effectiveFilter,
          scoreThreshold,
          {
            enableTelemetry: this._config.enableTelemetry,
            traceContext,
          },
        );

        return {
          vendor: collectionWeight.vendor,
          documents: documents as Array<[Document<TMetadata>, number]>,
        };
      } catch (error) {
        this._handleSearchError(collectionWeight.vendor, error);

        return {
          vendor: collectionWeight.vendor,
          documents: [] as Array<[Document<TMetadata>, number]>,
        };
      }
    });

    return await Promise.all(searchPromises);
  }

  reset(): void {
    for (const provider of this._providers.values()) {
      provider.reset();
    }
    this._providers.clear();
  }
}
