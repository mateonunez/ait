import type { Document, BaseMetadata } from "../../types/documents";
import type { CollectionVendor } from "../../config/collections.config";
import type { WeightedDocument } from "../../types/collections";

export interface WeightedRankFusionConfig {
  rrfK?: number;
  rrfWeight?: number;
  collectionWeightMultiplier?: number;
  normalizeAcrossCollections?: boolean;
}

export interface IWeightedRankFusionService {
  fuseResults<TMetadata extends BaseMetadata>(
    collectionResults: Array<{
      vendor: CollectionVendor;
      documents: Array<[Document<TMetadata>, number]>;
      collectionWeight: number;
    }>,
    maxResults?: number,
  ): WeightedDocument<TMetadata>[];
}

export class WeightedRankFusionService implements IWeightedRankFusionService {
  private readonly _rrfK: number;
  private readonly _rrfWeight: number;
  private readonly _collectionWeightMultiplier: number;
  private readonly _normalizeAcrossCollections: boolean;

  constructor(config?: WeightedRankFusionConfig) {
    this._rrfK = config?.rrfK ?? 60;
    this._rrfWeight = config?.rrfWeight ?? 0.7;
    this._collectionWeightMultiplier = config?.collectionWeightMultiplier ?? 1.0;
    this._normalizeAcrossCollections = config?.normalizeAcrossCollections ?? true;
  }

  fuseResults<TMetadata extends BaseMetadata>(
    collectionResults: Array<{
      vendor: CollectionVendor;
      documents: Array<[Document<TMetadata>, number]>;
      collectionWeight: number;
    }>,
    maxResults = 100,
  ): WeightedDocument<TMetadata>[] {
    if (collectionResults.length === 0) {
      console.warn("No collection results to fuse");
      return [];
    }

    const documentScores = new Map<
      string,
      {
        doc: Document<TMetadata>;
        vendor: CollectionVendor;
        collectionWeight: number;
        rrfScores: number[];
        relevanceScores: number[];
        ranks: number[];
      }
    >();

    for (const { vendor, documents, collectionWeight } of collectionResults) {
      documents.forEach(([doc, relevanceScore], rank) => {
        const docId = this.getDocumentId(doc);

        const rrfScore = 1 / (this._rrfK + rank + 1);

        let entry = documentScores.get(docId);
        if (!entry) {
          entry = {
            doc,
            vendor,
            collectionWeight,
            rrfScores: [],
            relevanceScores: [],
            ranks: [],
          };
          documentScores.set(docId, entry);
        }

        entry.rrfScores.push(rrfScore);
        entry.relevanceScores.push(relevanceScore);
        entry.ranks.push(rank);

        if (collectionWeight > entry.collectionWeight) {
          entry.collectionWeight = collectionWeight;
          entry.vendor = vendor;
        }
      });
    }

    let maxNormalizedScore = 0;
    const weightedDocuments: WeightedDocument<TMetadata>[] = [];

    for (const [, entry] of documentScores) {
      const avgRrfScore = entry.rrfScores.reduce((sum, s) => sum + s, 0) / entry.rrfScores.length;
      const maxRelevanceScore = Math.max(...entry.relevanceScores);

      const relevanceWeight = 1 - this._rrfWeight;
      const baseScore = this._rrfWeight * avgRrfScore + relevanceWeight * maxRelevanceScore;

      const weightedScore = baseScore * (1 + entry.collectionWeight * this._collectionWeightMultiplier);

      maxNormalizedScore = Math.max(maxNormalizedScore, weightedScore);

      weightedDocuments.push({
        ...entry.doc,
        collectionVendor: entry.vendor,
        collectionWeight: entry.collectionWeight,
        finalScore: weightedScore,
        metadata: {
          ...entry.doc.metadata,
          rrfScore: avgRrfScore,
          relevanceScore: maxRelevanceScore,
          hits: entry.rrfScores.length,
          ranks: entry.ranks,
        },
      });
    }

    if (this._normalizeAcrossCollections && maxNormalizedScore > 0) {
      for (const doc of weightedDocuments) {
        doc.finalScore = doc.finalScore / maxNormalizedScore;
      }
    }

    weightedDocuments.sort((a, b) => b.finalScore - a.finalScore);

    const topResults = weightedDocuments.slice(0, maxResults);
    return topResults;
  }

  private getDocumentId<TMetadata extends BaseMetadata>(doc: Document<TMetadata>): string {
    if (doc.metadata.id) {
      return String(doc.metadata.id);
    }

    const contentHash = doc.pageContent.slice(0, 100);
    const type = doc.metadata.__type || "unknown";
    return `${type}:${contentHash}`;
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
