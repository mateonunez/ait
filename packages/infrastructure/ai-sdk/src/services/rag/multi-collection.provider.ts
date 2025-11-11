import type { CollectionVendor } from "../../config/collections.config";
import { getCollectionConfig } from "../../config/collections.config";
import { QdrantProvider } from "./qdrant.provider";
import type { Document, BaseMetadata } from "../../types/documents";
import type { CollectionWeight, CollectionSearchResult, MultiCollectionSearchResult } from "../../types/collections";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";

export interface MultiCollectionProviderConfig {
  url?: string;
  embeddingsModel?: string;
  expectedVectorSize?: number;
  enableTelemetry?: boolean;
}

export class MultiCollectionProvider {
  private readonly _providers: Map<CollectionVendor, QdrantProvider>;
  private readonly _config: MultiCollectionProviderConfig;

  constructor(config?: MultiCollectionProviderConfig) {
    this._config = config || {};
    this._providers = new Map();
  }

  private getOrCreateProvider(vendor: CollectionVendor): QdrantProvider {
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
      console.debug(`Created QdrantProvider for collection: ${collectionConfig.name}`);
    }

    return provider;
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

    console.info("Searching across collections", {
      query: query.slice(0, 100),
      collectionsCount: collections.length,
      collections: collections.map((c) => `${c.vendor}:${c.weight}`).join(", "),
    });

    const searchPromises = collections.map(async (collectionWeight) => {
      const searchStartTime = Date.now();

      try {
        const provider = this.getOrCreateProvider(collectionWeight.vendor);
        const collectionLimit = Math.ceil(limit * collectionWeight.weight);

        console.debug(`Searching ${collectionWeight.vendor}`, {
          weight: collectionWeight.weight,
          limit: collectionLimit,
        });

        const documents = await provider.similaritySearch(query, collectionLimit, {
          enableTelemetry: this._config.enableTelemetry,
          traceContext,
        });

        const searchDuration = Date.now() - searchStartTime;

        console.debug(`Search completed for ${collectionWeight.vendor}`, {
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
        console.error(`Search failed for collection ${collectionWeight.vendor}`, {
          error: error instanceof Error ? error.message : String(error),
        });

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

    console.info("Multi-collection search completed", {
      totalDocuments,
      queriesExecuted,
      collectionsQueried: results.length,
      totalDuration,
    });

    if (traceContext) {
      recordSpan(
        "multi-collection-search",
        "search",
        traceContext,
        {
          query: query.slice(0, 100),
          collections: collections.map((c) => c.vendor),
        },
        {
          totalDocuments,
          queriesExecuted,
          collectionsQueried: results.length,
          duration: totalDuration,
          resultsByCollection: results.map((r) => ({
            vendor: r.vendor,
            documentCount: r.totalResults,
            duration: r.searchDuration,
          })),
        },
      );
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

    console.info("Searching across collections with scores", {
      query: query.slice(0, 100),
      collectionsCount: collections.length,
      scoreThreshold,
      filter: filter
        ? {
            types: filter.types,
            timeRange: filter.timeRange ? `${filter.timeRange.from} - ${filter.timeRange.to}` : undefined,
          }
        : undefined,
    });

    const searchPromises = collections.map(async (collectionWeight) => {
      try {
        const provider = this.getOrCreateProvider(collectionWeight.vendor);
        const collectionLimit = Math.ceil(limit * collectionWeight.weight);

        const documents = await provider.similaritySearchWithScore(query, collectionLimit, filter, scoreThreshold, {
          enableTelemetry: this._config.enableTelemetry,
          traceContext,
        });

        return {
          vendor: collectionWeight.vendor,
          documents: documents as Array<[Document<TMetadata>, number]>,
        };
      } catch (error) {
        console.error(`Search with score failed for collection ${collectionWeight.vendor}`, {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          vendor: collectionWeight.vendor,
          documents: [] as Array<[Document<TMetadata>, number]>,
        };
      }
    });

    const results = await Promise.all(searchPromises);

    if (traceContext) {
      recordSpan(
        "multi-collection-search-with-score",
        "search",
        traceContext,
        { query: query.slice(0, 100) },
        {
          duration: Date.now() - startTime,
          collectionsQueried: results.length,
          totalDocuments: results.reduce((sum, r) => sum + r.documents.length, 0),
        },
      );
    }

    return results;
  }

  reset(): void {
    for (const provider of this._providers.values()) {
      provider.reset();
    }
    this._providers.clear();
  }
}
