import type { RankFusionConfig, RankedResult, QueryResult } from "../../types/rag";
import type { Document, BaseMetadata } from "../../types/documents";

/**
 * Interface for rank fusion service
 */
export interface IRankFusionService {
  /**
   * Fuse results from multiple queries using Reciprocal Rank Fusion (RRF)
   * @param queryResults - Results from multiple query variants
   * @param documentIdExtractor - Function to extract unique ID from document
   * @returns Array of ranked results sorted by final score
   */
  fuseResults<TMetadata extends BaseMetadata>(
    queryResults: QueryResult<TMetadata>[],
    documentIdExtractor: (doc: Document<TMetadata>) => string,
  ): RankedResult<TMetadata>[];
}

export class RankFusionService implements IRankFusionService {
  private readonly _rrfK: number;
  private readonly _rrfWeight: number;
  private readonly _similarityWeight: number;

  constructor(config: RankFusionConfig = {}) {
    this._rrfK = Math.min(Math.max(config.rrfK ?? 60, 10), 100);
    this._rrfWeight = config.rrfWeight ?? 0.8;
    this._similarityWeight = config.similarityWeight ?? 0.2;

    // Ensure weights sum to 1.0
    const totalWeight = this._rrfWeight + this._similarityWeight;
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      this._rrfWeight = this._rrfWeight / totalWeight;
      this._similarityWeight = this._similarityWeight / totalWeight;
    }
  }

  fuseResults<TMetadata extends BaseMetadata>(
    queryResults: QueryResult<TMetadata>[],
    documentIdExtractor: (doc: Document<TMetadata>) => string,
  ): RankedResult<TMetadata>[] {
    if (queryResults.length === 0) {
      return [];
    }

    const hits = new Map<string, RankedResult<TMetadata>>();

    // Aggregate results across all queries
    for (const { queryIdx, results } of queryResults) {
      results.forEach(([doc, score], rank) => {
        const id = documentIdExtractor(doc);
        const existing = hits.get(id);

        if (existing) {
          existing.hits += 1;
          existing.sumScore += score;
          existing.ranks.push(rank);
          if (score > existing.bestScore) {
            existing.bestScore = score;
          }
        } else {
          hits.set(id, {
            doc,
            bestScore: score,
            sumScore: score,
            hits: 1,
            ranks: [rank],
            rrfScore: 0,
            finalScore: 0,
          });
        }
      });
    }

    // Calculate RRF scores and final scores
    const ranked = Array.from(hits.values()).map((hit) => {
      // RRF: sum of 1/(k + rank) across all queries where doc appeared
      const rrfScore = hit.ranks.reduce((sum, rank) => sum + 1 / (this._rrfK + rank + 1), 0);

      // Normalize by number of queries for fair comparison
      const normalizedRRF = rrfScore / queryResults.length;

      // Combine RRF with best similarity score
      const finalScore = this._rrfWeight * normalizedRRF + this._similarityWeight * hit.bestScore;

      return {
        ...hit,
        rrfScore,
        finalScore,
      };
    });

    // Sort by final score descending
    ranked.sort((a, b) => b.finalScore - a.finalScore);

    return ranked;
  }
}
