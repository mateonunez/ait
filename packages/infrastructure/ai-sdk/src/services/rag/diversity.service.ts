import type { DiversityConfig } from "../../types/rag";
import type { Document, BaseMetadata } from "../../types/documents";

/**
 * Interface for diversity service
 */
export interface IDiversityService {
  /**
   * Validate that queries have good diversity using Jaccard similarity
   * @param queries - Array of query strings
   * @returns True if diversity is within acceptable range
   */
  validateQueryDiversity(queries: string[]): boolean;

  /**
   * Apply Maximal Marginal Relevance to diversify results
   * @param selectedDocs - Documents already selected (ranked by relevance)
   * @param candidateDocs - Pool of candidate documents to select from
   * @param maxDocs - Maximum number of documents to return
   * @returns Diversified document list
   */
  applyMMR<TMetadata extends BaseMetadata>(
    selectedDocs: Document<TMetadata>[],
    candidateDocs: Document<TMetadata>[],
    maxDocs: number,
  ): Document<TMetadata>[];
}

/**
 * Service for query and result diversification
 */
export class DiversityService implements IDiversityService {
  private readonly _enableDiversification: boolean;
  private readonly _diversityLambda: number;
  private readonly _minSimilarity: number;
  private readonly _maxSimilarity: number;

  constructor(config: DiversityConfig = {}) {
    this._enableDiversification = config.enableDiversification ?? true;
    this._diversityLambda = Math.min(Math.max(config.diversityLambda ?? 0.7, 0), 1);
    this._minSimilarity = Math.min(Math.max(config.minSimilarity ?? 0.15, 0), 1);
    this._maxSimilarity = Math.min(Math.max(config.maxSimilarity ?? 0.65, 0), 1);
  }

  validateQueryDiversity(queries: string[]): boolean {
    if (queries.length < 2) return true;

    const getTokens = (q: string) => new Set(q.toLowerCase().split(/\s+/));

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < queries.length; i++) {
      for (let j = i + 1; j < queries.length; j++) {
        const tokensA = getTokens(queries[i]);
        const tokensB = getTokens(queries[j]);
        const similarity = this._calculateJaccardSimilarity(tokensA, tokensB);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    const avgSimilarity = totalSimilarity / comparisons;

    return avgSimilarity >= this._minSimilarity && avgSimilarity <= this._maxSimilarity;
  }

  applyMMR<TMetadata extends BaseMetadata>(
    selectedDocs: Document<TMetadata>[],
    candidateDocs: Document<TMetadata>[],
    maxDocs: number,
  ): Document<TMetadata>[] {
    if (!this._enableDiversification) {
      return selectedDocs.slice(0, maxDocs);
    }

    if (selectedDocs.length === 0) {
      return candidateDocs.slice(0, maxDocs);
    }

    const result: Document<TMetadata>[] = [selectedDocs[0]]; // Start with top doc
    const remaining = [...candidateDocs];

    const getTokens = (doc: Document<TMetadata>) => new Set(doc.pageContent.toLowerCase().split(/\s+/).slice(0, 100)); // First 100 words

    while (result.length < Math.min(maxDocs, candidateDocs.length)) {
      let bestDoc: Document<TMetadata> | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      let bestIdx = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const candidateTokens = getTokens(candidate);

        // Calculate max similarity to already selected docs
        let maxSimilarity = 0;
        for (const selected of result) {
          const selectedTokens = getTokens(selected);
          const sim = this._calculateCosineSimilarity(candidateTokens, selectedTokens);
          maxSimilarity = Math.max(maxSimilarity, sim);
        }

        // MMR score: balance relevance (position in list) and diversity (1 - similarity)
        const relevance = 1 - i / remaining.length; // Normalize position
        const diversity = 1 - maxSimilarity;
        const mmrScore = this._diversityLambda * relevance + (1 - this._diversityLambda) * diversity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestDoc = candidate;
          bestIdx = i;
        }
      }

      if (bestDoc && bestIdx >= 0) {
        result.push(bestDoc);
        remaining.splice(bestIdx, 1);
      } else {
        break;
      }
    }

    console.debug("MMR diversification applied", {
      before: selectedDocs.length,
      after: result.length,
      lambda: this._diversityLambda,
    });

    return result;
  }

  private _calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter((t) => setB.has(t)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  }

  private _calculateCosineSimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
    const intersection = new Set([...tokensA].filter((t) => tokensB.has(t)));
    return intersection.size / Math.sqrt(tokensA.size * tokensB.size);
  }
}
