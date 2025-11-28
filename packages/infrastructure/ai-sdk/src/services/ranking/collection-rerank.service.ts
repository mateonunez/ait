import type { Document, BaseMetadata } from "../../types/documents";
import type { CollectionVendor } from "../../config/collections.config";
import type { WeightedDocument } from "../../types/collections";
import type { IRerankService } from "./rerank.service";
import { createSpanWithTiming } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";
import { CollectionDiversityService, type ICollectionDiversityService } from "./collection-diversity.service";

export interface ICollectionRerankService {
  rerankByCollection<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
    userQuery: string,
    maxResults?: number,
    traceContext?: TraceContext,
  ): Promise<WeightedDocument<TMetadata>[]>;
}

export class CollectionRerankService implements ICollectionRerankService {
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
  ): Promise<WeightedDocument<TMetadata>[]> {
    if (documents.length === 0) {
      console.warn("No documents to rerank");
      return [];
    }

    const endSpan = traceContext
      ? createSpanWithTiming("collection-rerank", "rag", traceContext, {
          query: userQuery.slice(0, 100),
          inputDocuments: documents.length,
        })
      : null;

    const documentsByCollection = this.groupByCollection(documents);

    // Process collections in parallel
    const rerankPromises = Object.entries(documentsByCollection).map(async ([vendor, collectionDocs]) => {
      try {
        return await this.rerankCollectionGroup(vendor as CollectionVendor, collectionDocs, userQuery, traceContext);
      } catch (error) {
        console.error(`Reranking failed for collection ${vendor}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return collectionDocs;
      }
    });

    const rerankedGroups = await Promise.all(rerankPromises);

    const mergedResults = this.mergeRerankedGroups(rerankedGroups);
    const finalResults = mergedResults.slice(0, maxResults);

    if (endSpan) {
      endSpan({
        outputDocuments: finalResults.length,
        collectionsProcessed: Object.keys(documentsByCollection).length,
        collectionDistribution: this.getCollectionDistribution(finalResults),
      });
    }

    return finalResults;
  }

  private groupByCollection<TMetadata extends BaseMetadata>(
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

  private async rerankCollectionGroup<TMetadata extends BaseMetadata>(
    vendor: CollectionVendor,
    documents: WeightedDocument<TMetadata>[],
    userQuery: string,
    traceContext?: TraceContext,
  ): Promise<WeightedDocument<TMetadata>[]> {
    if (!this._reranker) {
      console.debug(`No reranker available for ${vendor}, using original order`);
      return documents;
    }

    const collectionSpecificQuery = this._useCollectionSpecificPrompts
      ? this.buildCollectionSpecificQuery(vendor, userQuery)
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
        const originalDoc = documents.find((d) => this.isSameDocument(d, doc));
        return {
          ...doc,
          collectionVendor: originalDoc?.collectionVendor || vendor,
          collectionWeight: originalDoc?.collectionWeight || 1.0,
          finalScore: originalDoc?.finalScore || 1.0 - index / rerankedDocs.length,
        } as WeightedDocument<TMetadata>;
      });
    } catch (error) {
      console.warn(`Reranking failed for ${vendor}, using original order`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return documents;
    }
  }

  private buildCollectionSpecificQuery(vendor: CollectionVendor, userQuery: string): string {
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

  private mergeRerankedGroups<TMetadata extends BaseMetadata>(
    groups: Array<WeightedDocument<TMetadata>[]>,
  ): WeightedDocument<TMetadata>[] {
    const allDocuments = groups.flat();

    const diversified = this._diversityService.applyDiversityConstraints(allDocuments, allDocuments.length);

    return diversified;
  }

  private isSameDocument<TMetadata extends BaseMetadata>(
    doc1: WeightedDocument<TMetadata>,
    doc2: Document<TMetadata>,
  ): boolean {
    if (doc1.metadata.id && doc2.metadata.id) {
      return doc1.metadata.id === doc2.metadata.id;
    }

    return doc1.pageContent.slice(0, 100) === doc2.pageContent.slice(0, 100);
  }

  private getCollectionDistribution<TMetadata extends BaseMetadata>(
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
