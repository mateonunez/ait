import type { CollectionVendor } from "../../config/collections.config";
import type { WeightedDocument } from "../../types/collections";
import type { BaseMetadata } from "../../types/documents";

export interface CollectionDiversityConfig {
  minDocsPerCollection?: number;
  maxCollectionDominance?: number;
  enforceMinRepresentation?: boolean;
  interleavingStrategy?: "round-robin" | "weighted" | "score-based";
}

export interface ICollectionDiversityService {
  enforceMinRepresentation<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    minPerCollection: number,
    maxTotal: number,
  ): WeightedDocument<TMetadata>[];

  interleaveCollections<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    weights: Map<CollectionVendor, number>,
    maxResults: number,
  ): WeightedDocument<TMetadata>[];

  applyDiversityConstraints<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
    maxResults: number,
  ): WeightedDocument<TMetadata>[];
}

export class CollectionDiversityService implements ICollectionDiversityService {
  private readonly _minDocsPerCollection: number;
  private readonly _maxCollectionDominance: number;
  private readonly _enforceMinRepresentation: boolean;
  private readonly _interleavingStrategy: "round-robin" | "weighted" | "score-based";

  constructor(config?: CollectionDiversityConfig) {
    this._minDocsPerCollection = config?.minDocsPerCollection ?? 3;
    this._maxCollectionDominance = config?.maxCollectionDominance ?? 0.5;
    this._enforceMinRepresentation = config?.enforceMinRepresentation ?? true;
    this._interleavingStrategy = config?.interleavingStrategy ?? "weighted";
  }

  /**
   * Enforce minimum representation from each collection
   */
  enforceMinRepresentation<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    minPerCollection: number,
    maxTotal: number,
  ): WeightedDocument<TMetadata>[] {
    const result: WeightedDocument<TMetadata>[] = [];
    const collections = Array.from(documentsByCollection.keys());

    // First pass: ensure minimum representation
    for (const vendor of collections) {
      const docs = documentsByCollection.get(vendor) || [];
      const toTake = Math.min(minPerCollection, docs.length, maxTotal - result.length);

      result.push(...docs.slice(0, toTake));

      if (result.length >= maxTotal) {
        break;
      }
    }

    // Second pass: fill remaining slots with best scores
    if (result.length < maxTotal) {
      const remaining: WeightedDocument<TMetadata>[] = [];

      for (const vendor of collections) {
        const docs = documentsByCollection.get(vendor) || [];
        remaining.push(...docs.slice(minPerCollection));
      }

      remaining.sort((a, b) => b.finalScore - a.finalScore);
      const toAdd = Math.min(maxTotal - result.length, remaining.length);
      result.push(...remaining.slice(0, toAdd));
    }

    return result;
  }

  /**
   * Interleave documents from different collections based on strategy
   */
  interleaveCollections<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    weights: Map<CollectionVendor, number>,
    maxResults: number,
  ): WeightedDocument<TMetadata>[] {
    switch (this._interleavingStrategy) {
      case "round-robin":
        return this._roundRobinInterleave(documentsByCollection, maxResults);
      case "weighted":
        return this._weightedInterleave(documentsByCollection, weights, maxResults);
      case "score-based":
        return this._scoreBasedInterleave(documentsByCollection, maxResults);
      default:
        return this._weightedInterleave(documentsByCollection, weights, maxResults);
    }
  }

  /**
   * Apply diversity constraints to a flat list of documents
   */
  applyDiversityConstraints<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
    maxResults: number,
  ): WeightedDocument<TMetadata>[] {
    if (documents.length === 0) {
      return [];
    }

    // Group by collection
    const byCollection = this._groupByCollection(documents);

    // Check if diversity enforcement is needed
    const collectionCount = byCollection.size;
    if (collectionCount === 1) {
      // Single collection - no diversity needed
      return documents.slice(0, maxResults);
    }

    // Calculate weights from existing documents
    const weights = this._calculateWeights(byCollection, documents.length);

    // Apply interleaving with diversity constraints
    let result = this.interleaveCollections(byCollection, weights, maxResults);

    // Enforce minimum representation if configured
    if (this._enforceMinRepresentation && collectionCount > 1) {
      const minDocs = Math.min(this._minDocsPerCollection, Math.floor(maxResults / collectionCount));
      result = this.enforceMinRepresentation(byCollection, minDocs, maxResults);
    }

    // Ensure no collection dominates
    result = this._capCollectionDominance(result, maxResults);

    return result.slice(0, maxResults);
  }

  /**
   * Round-robin interleaving - alternates evenly between collections
   */
  private _roundRobinInterleave<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    maxResults: number,
  ): WeightedDocument<TMetadata>[] {
    const result: WeightedDocument<TMetadata>[] = [];
    const collections = Array.from(documentsByCollection.entries());
    const indices = new Map<CollectionVendor, number>();

    // Initialize indices
    for (const [vendor] of collections) {
      indices.set(vendor, 0);
    }

    let currentCollectionIdx = 0;

    while (result.length < maxResults) {
      let addedAny = false;

      for (let i = 0; i < collections.length; i++) {
        const entry = collections[currentCollectionIdx];
        if (!entry) break;

        const [vendor, docs] = entry;
        const idx = indices.get(vendor) || 0;

        if (idx < docs.length) {
          const doc = docs[idx];
          if (doc) {
            result.push(doc);
            indices.set(vendor, idx + 1);
            addedAny = true;

            if (result.length >= maxResults) {
              break;
            }
          }
        }

        currentCollectionIdx = (currentCollectionIdx + 1) % collections.length;
      }

      // If no documents were added in a full round, we're done
      if (!addedAny) {
        break;
      }
    }

    return result;
  }

  /**
   * Weighted interleaving - distributes based on collection weights
   */
  private _weightedInterleave<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    weights: Map<CollectionVendor, number>,
    maxResults: number,
  ): WeightedDocument<TMetadata>[] {
    const result: WeightedDocument<TMetadata>[] = [];
    const collections = Array.from(documentsByCollection.entries());

    // Calculate target counts per collection based on weights
    const totalWeight = Array.from(weights.values()).reduce((sum, w) => sum + w, 0);
    const targetCounts = new Map<CollectionVendor, number>();

    for (const [vendor, docs] of collections) {
      const weight = weights.get(vendor) || 1.0;
      const targetCount = Math.ceil((weight / totalWeight) * maxResults);
      targetCounts.set(vendor, Math.min(targetCount, docs.length));
    }

    // First pass: allocate based on targets
    const indices = new Map<CollectionVendor, number>();
    for (const [vendor] of collections) {
      indices.set(vendor, 0);
    }

    // Sort collections by weight (descending) for priority allocation
    const sortedCollections = collections.sort((a, b) => {
      const weightA = weights.get(a[0]) || 1.0;
      const weightB = weights.get(b[0]) || 1.0;
      return weightB - weightA;
    });

    // Interleave proportionally
    while (result.length < maxResults) {
      let addedAny = false;

      for (const [vendor, docs] of sortedCollections) {
        const idx = indices.get(vendor) || 0;
        const target = targetCounts.get(vendor) || 0;
        const currentCount = result.filter((d) => d.collectionVendor === vendor).length;

        // Add if we haven't reached target and have docs available
        if (currentCount < target && idx < docs.length) {
          const doc = docs[idx];
          if (doc) {
            result.push(doc);
            indices.set(vendor, idx + 1);
            addedAny = true;

            if (result.length >= maxResults) {
              break;
            }
          }
        }
      }

      // If no documents were added, fill remaining with best scores
      if (!addedAny) {
        const remaining: WeightedDocument<TMetadata>[] = [];
        for (const [vendor, docs] of collections) {
          const idx = indices.get(vendor) || 0;
          if (idx < docs.length) {
            remaining.push(...docs.slice(idx));
          }
        }
        remaining.sort((a, b) => b.finalScore - a.finalScore);
        const toAdd = Math.min(maxResults - result.length, remaining.length);
        result.push(...remaining.slice(0, toAdd));
        break;
      }
    }

    return result;
  }

  /**
   * Score-based interleaving with diversity - prioritizes scores but ensures variety
   */
  private _scoreBasedInterleave<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    maxResults: number,
  ): WeightedDocument<TMetadata>[] {
    const result: WeightedDocument<TMetadata>[] = [];
    const allDocs: WeightedDocument<TMetadata>[] = [];

    // Flatten and sort by score
    for (const docs of documentsByCollection.values()) {
      allDocs.push(...docs);
    }
    allDocs.sort((a, b) => b.finalScore - a.finalScore);

    // Add documents while maintaining diversity
    const collectionCounts = new Map<CollectionVendor, number>();
    const maxPerCollection = Math.ceil(maxResults * this._maxCollectionDominance);

    for (const doc of allDocs) {
      const vendor = doc.collectionVendor;
      const currentCount = collectionCounts.get(vendor) || 0;

      // Add if collection hasn't exceeded dominance limit
      if (currentCount < maxPerCollection) {
        result.push(doc);
        collectionCounts.set(vendor, currentCount + 1);

        if (result.length >= maxResults) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Group documents by collection vendor
   */
  private _groupByCollection<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
  ): Map<CollectionVendor, WeightedDocument<TMetadata>[]> {
    const groups = new Map<CollectionVendor, WeightedDocument<TMetadata>[]>();

    for (const doc of documents) {
      const vendor = doc.collectionVendor;
      const existing = groups.get(vendor);
      if (!existing) {
        groups.set(vendor, [doc]);
      } else {
        existing.push(doc);
      }
    }

    // Sort each group by score
    for (const docs of groups.values()) {
      docs.sort((a, b) => b.finalScore - a.finalScore);
    }

    return groups;
  }

  /**
   * Calculate weights from document distribution
   */
  private _calculateWeights<TMetadata extends BaseMetadata>(
    documentsByCollection: Map<CollectionVendor, WeightedDocument<TMetadata>[]>,
    totalDocs: number,
  ): Map<CollectionVendor, number> {
    const weights = new Map<CollectionVendor, number>();

    for (const [vendor, docs] of documentsByCollection.entries()) {
      // Use average collection weight from documents
      const avgWeight = docs.reduce((sum, d) => sum + d.collectionWeight, 0) / docs.length;
      weights.set(vendor, avgWeight);
    }

    return weights;
  }

  /**
   * Cap collection dominance to prevent one collection from overwhelming results
   */
  private _capCollectionDominance<TMetadata extends BaseMetadata>(
    documents: WeightedDocument<TMetadata>[],
    maxResults: number,
  ): WeightedDocument<TMetadata>[] {
    const maxPerCollection = Math.ceil(maxResults * this._maxCollectionDominance);
    const collectionCounts = new Map<CollectionVendor, number>();
    const result: WeightedDocument<TMetadata>[] = [];
    const overflow: WeightedDocument<TMetadata>[] = [];

    for (const doc of documents) {
      const vendor = doc.collectionVendor;
      const currentCount = collectionCounts.get(vendor) || 0;

      if (currentCount < maxPerCollection) {
        result.push(doc);
        collectionCounts.set(vendor, currentCount + 1);
      } else {
        overflow.push(doc);
      }
    }

    // If we have space and overflow, do NOT add best overflow docs if they violate the cap
    // We strictly enforce the dominance limit for multi-collection results

    return result;
  }
}
