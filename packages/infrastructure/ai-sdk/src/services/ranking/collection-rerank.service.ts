import { getLogger } from "@ait/core";
import type { CollectionVendor } from "../../config/collections.config";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { WeightedDocument } from "../../types/collections";
import type { BaseMetadata, Document } from "../../types/documents";
import type { TraceContext } from "../../types/telemetry";
import { CollectionDiversityService, type ICollectionDiversityService } from "./collection-diversity.service";
import type { IRerankService } from "./rerank.service";

const logger = getLogger();

export interface ICollectionRerankService {
  rerankByCollection<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
    userQuery: string,
    maxResults?: number,
    traceContext?: TraceContext,
    targetEntityTypes?: string[],
  ): Promise<WeightedDocument<TMetadata>[]>;
}

export class CollectionRerankService implements ICollectionRerankService {
  private readonly name = "collection-rerank";
  private readonly _reranker?: IRerankService;
  private readonly _useCollectionSpecificPrompts: boolean;
  private readonly _diversityService: ICollectionDiversityService;

  constructor(
    reranker?: IRerankService,
    config?: { useCollectionSpecificPrompts?: boolean },
    diversityService?: ICollectionDiversityService,
  ) {
    this._reranker = reranker;
    this._useCollectionSpecificPrompts = config?.useCollectionSpecificPrompts ?? true;
    this._diversityService = diversityService || new CollectionDiversityService();
  }

  async rerankByCollection<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
    userQuery: string,
    maxResults = 100,
    traceContext?: TraceContext,
    targetEntityTypes?: string[],
  ): Promise<WeightedDocument<TMetadata>[]> {
    if (documents.length === 0) {
      logger.warn(`Service [${this.name}] No documents to rerank`);
      return [];
    }

    const startTime = Date.now();
    const endSpan = traceContext
      ? createSpanWithTiming("ranking/collection-rerank", "rag", traceContext, {
          query: userQuery.slice(0, 100),
          inputDocuments: documents.length,
        })
      : null;

    const documentsByCollection = this._groupByCollection(documents);

    // Process collections in parallel
    const rerankPromises = Object.entries(documentsByCollection).map(async ([vendor, collectionDocs]) => {
      try {
        return await this._rerankCollectionGroup(vendor as CollectionVendor, collectionDocs, userQuery, traceContext);
      } catch (error) {
        logger.error(`Service [${this.name}] Reranking failed for collection ${vendor}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return collectionDocs;
      }
    });

    const rerankedGroups = await Promise.all(rerankPromises);

    const mergedResults = this._mergeRerankedGroups(rerankedGroups, targetEntityTypes);
    const finalResults = mergedResults.slice(0, maxResults);

    const duration = Date.now() - startTime;
    const telemetryData = {
      inputDocuments: documents.length,
      outputDocuments: finalResults.length,
      collectionsProcessed: Object.keys(documentsByCollection).length,
      collectionDistribution: this._getCollectionDistribution(finalResults),
      duration,
    };

    if (endSpan) endSpan(telemetryData);

    logger.info(`Service [${this.name}] completed`, telemetryData);

    return finalResults;
  }

  private _groupByCollection<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
  ): Record<string, WeightedDocument<TMetadata>[]> {
    const groups: Record<string, WeightedDocument<TMetadata>[]> = {};

    for (const doc of documents) {
      const vendor = doc.collectionVendor;
      if (!groups[vendor]) {
        groups[vendor] = [];
      }
      groups[vendor].push(doc);
    }

    return groups;
  }

  private async _rerankCollectionGroup<TMetadata extends BaseMetadata>(
    vendor: CollectionVendor,
    documents: WeightedDocument<TMetadata>[],
    userQuery: string,
    traceContext?: TraceContext,
  ): Promise<WeightedDocument<TMetadata>[]> {
    if (!this._reranker) {
      logger.debug(`Service [${this.name}]: no reranker available for ${vendor}, using original order`);
      return documents;
    }

    const collectionSpecificQuery = this._useCollectionSpecificPrompts
      ? this._buildCollectionSpecificQuery(vendor, userQuery)
      : userQuery;

    try {
      const plainDocuments = documents.map((d) => ({
        ...d,
        collectionVendor: undefined,
        collectionWeight: undefined,
        finalScore: undefined,
      })) as Document<TMetadata>[];

      const rerankedDocs = await this._reranker.rerank(collectionSpecificQuery, plainDocuments, documents.length);

      return rerankedDocs.map((doc, index) => {
        const originalDoc = documents.find((d) => this._isSameDocument(d, doc));
        return {
          ...doc,
          collectionVendor: originalDoc?.collectionVendor || vendor,
          collectionWeight: originalDoc?.collectionWeight || 1.0,
          finalScore: originalDoc?.finalScore || 1.0 - index / rerankedDocs.length,
        } as WeightedDocument<TMetadata>;
      });
    } catch (error) {
      logger.warn(`Reranking failed for ${vendor}, using original order`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return documents;
    }
  }

  private _buildCollectionSpecificQuery(vendor: CollectionVendor, userQuery: string): string {
    const collectionContext: Record<CollectionVendor, string> = {
      spotify: "music and audio content",
      github: "code repositories and development activity",
      linear: "project tasks and issues",
      x: "social media posts and tweets",
      notion: "notes, pages, and knowledge base content",
      slack: "team communication and channel updates",
      google: "google suite",
      "google-calendar": "google calendar events and updates",
      youtube: "youtube content",
      general: "general information",
    };

    const context = collectionContext[vendor] || "relevant content";
    return `Considering ${context}: ${userQuery}`;
  }

  private _mergeRerankedGroups<TMetadata extends BaseMetadata>(
    groups: Array<WeightedDocument<TMetadata>[]>,
    targetEntityTypes?: string[],
  ): WeightedDocument<TMetadata>[] {
    const allDocuments = groups.flat();

    const diversified = this._diversityService.applyDiversityConstraints(
      allDocuments,
      allDocuments.length,
      targetEntityTypes,
    );

    return diversified;
  }

  private _isSameDocument<TMetadata extends BaseMetadata>(
    doc1: WeightedDocument<TMetadata>,
    doc2: Document<TMetadata>,
  ): boolean {
    if (doc1.metadata.id && doc2.metadata.id) {
      return doc1.metadata.id === doc2.metadata.id;
    }

    return doc1.pageContent.slice(0, 100) === doc2.pageContent.slice(0, 100);
  }

  private _getCollectionDistribution<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const doc of documents) {
      const vendor = doc.collectionVendor;
      distribution[vendor] = (distribution[vendor] || 0) + 1;
    }

    return distribution;
  }
}
