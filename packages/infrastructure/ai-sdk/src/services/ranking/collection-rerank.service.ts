import type { Document, BaseMetadata } from "../../types/documents";
import type { CollectionVendor } from "../../config/collections.config";
import type { WeightedDocument } from "../../types/collections";
import type { IRerankService } from "./rerank.service";
import { recordSpan } from "../../telemetry/telemetry.middleware";
import type { TraceContext } from "../../types/telemetry";

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

  constructor(reranker?: IRerankService, config?: { useCollectionSpecificPrompts?: boolean }) {
    this._reranker = reranker;
    this._useCollectionSpecificPrompts = config?.useCollectionSpecificPrompts ?? true;
  }

  async rerankByCollection<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
    userQuery: string,
    maxResults = 100,
    traceContext?: TraceContext,
  ): Promise<WeightedDocument<TMetadata>[]> {
    const startTime = Date.now();

    if (documents.length === 0) {
      console.warn("No documents to rerank");
      return [];
    }

    const documentsByCollection = this.groupByCollection(documents);
    const rerankedGroups: Array<WeightedDocument<TMetadata>[]> = [];

    for (const [vendor, collectionDocs] of Object.entries(documentsByCollection)) {
      try {
        const reranked = await this.rerankCollectionGroup(
          vendor as CollectionVendor,
          collectionDocs,
          userQuery,
          traceContext,
        );
        rerankedGroups.push(reranked);
      } catch (error) {
        console.error(`Reranking failed for collection ${vendor}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        rerankedGroups.push(collectionDocs);
      }
    }

    const mergedResults = this.mergeRerankedGroups(rerankedGroups);
    const finalResults = mergedResults.slice(0, maxResults);

    const duration = Date.now() - startTime;
    if (traceContext) {
      recordSpan(
        "collection-rerank",
        "rag",
        traceContext,
        {
          query: userQuery.slice(0, 100),
          inputDocuments: documents.length,
        },
        {
          outputDocuments: finalResults.length,
          collectionsProcessed: Object.keys(documentsByCollection).length,
          duration,
          collectionDistribution: this.getCollectionDistribution(finalResults),
        },
      );
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
      general: "general information",
    };

    const context = collectionContext[vendor] || "relevant content";
    return `Considering ${context}: ${userQuery}`;
  }

  private mergeRerankedGroups<TMetadata extends BaseMetadata>(
    groups: Array<WeightedDocument<TMetadata>[]>,
  ): WeightedDocument<TMetadata>[] {
    const allDocuments = groups.flat();

    allDocuments.sort((a, b) => b.finalScore - a.finalScore);

    return allDocuments;
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
