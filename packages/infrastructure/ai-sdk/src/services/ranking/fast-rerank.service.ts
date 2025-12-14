import type { EntityType } from "@ait/core";
import type { BaseMetadata, Document } from "../../types/documents";
import { getTextTokenizer } from "../tokenizer/strategies";
import type { IRerankService } from "./rerank.service";

export interface FastRerankConfig {
  keywordWeight?: number;
  vectorScoreWeight?: number;
  recencyWeight?: number;
  recencyWindowHours?: number;
}

export class FastRerankService implements IRerankService {
  private readonly _keywordWeight: number;
  private readonly _vectorScoreWeight: number;
  private readonly _recencyWeight: number;
  private readonly _recencyWindowHours: number;

  constructor(config?: FastRerankConfig) {
    this._keywordWeight = config?.keywordWeight ?? 0.3;
    this._vectorScoreWeight = config?.vectorScoreWeight ?? 0.5;
    this._recencyWeight = config?.recencyWeight ?? 0.2;
    this._recencyWindowHours = config?.recencyWindowHours ?? 168; // 1 week
  }

  async rerank<TMetadata extends BaseMetadata>(
    query: string,
    documents: Document<TMetadata>[],
    topK = 100,
  ): Promise<Document<TMetadata>[]> {
    if (documents.length === 0) return [];
    if (documents.length === 1) return documents;

    // Use default tokenizer for query
    const queryTokenizer = getTextTokenizer();
    const queryTerms = queryTokenizer.tokenize(query);
    const now = Date.now();

    // Score all documents
    const scored = documents.map((doc) => {
      const keywordScore = this._computeKeywordScore(queryTerms, doc);
      const vectorScore = this._getExistingScore(doc);
      const recencyScore = this._computeRecencyScore(doc, now);

      // Weighted combination of scores
      const finalScore =
        this._keywordWeight * keywordScore + this._vectorScoreWeight * vectorScore + this._recencyWeight * recencyScore;

      return { doc, finalScore, keywordScore, vectorScore, recencyScore };
    });

    // Sort by final score descending
    scored.sort((a, b) => b.finalScore - a.finalScore);

    // Return top-k with updated metadata
    return scored.slice(0, topK).map((s, index) => {
      const doc = s.doc;
      doc.metadata = {
        ...doc.metadata,
        score: s.finalScore,
        rerankScore: s.finalScore * 10, // Scale to 0-10 for compatibility
        keywordScore: s.keywordScore,
        vectorScore: s.vectorScore,
        recencyScore: s.recencyScore,
        rerankRank: index,
        wasReranked: true,
      };
      return doc;
    });
  }

  /**
   * Get entity type from document metadata for tokenizer selection.
   */
  private _getEntityType<TMetadata extends BaseMetadata>(doc: Document<TMetadata>): EntityType | undefined {
    const metadata = doc.metadata as Record<string, unknown>;
    const type = metadata.__type as EntityType | undefined;

    // Map known types to EntityType
    if (type === "repository_file" || type === "commit" || type === "pull_request" || type === "repository") {
      return type as EntityType;
    }

    // Fallback: check for code-like indicators
    if (metadata.extension !== undefined) {
      return "repository_file";
    }

    return undefined;
  }

  /**
   * Compute keyword overlap score using Jaccard-like similarity.
   * Uses appropriate tokenizer based on document entity type.
   */
  private _computeKeywordScore<TMetadata extends BaseMetadata>(
    queryTerms: Set<string>,
    doc: Document<TMetadata>,
  ): number {
    if (queryTerms.size === 0) return 0;

    const content = doc.pageContent;
    const entityType = this._getEntityType(doc);

    // Get appropriate tokenizer for this document type
    const tokenizer = getTextTokenizer(entityType);
    const contentTerms = tokenizer.tokenize(content);

    let matchCount = 0;
    for (const term of queryTerms) {
      if (contentTerms.has(term)) {
        matchCount++;
      }
    }

    // Normalize by query term count
    const score = matchCount / queryTerms.size;

    // Boost for exact phrase matches
    const contentLower = content.toLowerCase();
    const queryPhrase = Array.from(queryTerms).join(" ");
    const phraseBoost = contentLower.includes(queryPhrase) ? 0.2 : 0;

    // Additional boost for exact identifier matches in code
    let identifierBoost = 0;
    if (entityType) {
      for (const term of queryTerms) {
        // Check for exact identifier match (word boundaries)
        const identifierPattern = new RegExp(`\\b${term}\\b`, "i");
        if (identifierPattern.test(content)) {
          identifierBoost += 0.1;
        }
      }
      identifierBoost = Math.min(identifierBoost, 0.3); // Cap at 0.3
    }

    return Math.min(score + phraseBoost + identifierBoost, 1.0);
  }

  /**
   * Get existing vector similarity score from document metadata
   */
  private _getExistingScore<TMetadata extends BaseMetadata>(doc: Document<TMetadata>): number {
    const metadata = doc.metadata as Record<string, unknown>;

    // Try various score fields
    const score =
      (metadata.score as number) ??
      (metadata.relevanceScore as number) ??
      (metadata.similarity as number) ??
      (metadata._score as number) ??
      0.5; // Default mid-range score

    // Normalize to 0-1 if needed
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Compute recency boost based on document timestamp
   */
  private _computeRecencyScore<TMetadata extends BaseMetadata>(doc: Document<TMetadata>, now: number): number {
    const metadata = doc.metadata as Record<string, unknown>;

    // Try various timestamp fields
    const timestamp =
      this._parseTimestamp(metadata.createdAt) ??
      this._parseTimestamp(metadata.updatedAt) ??
      this._parseTimestamp(metadata.playedAt) ??
      this._parseTimestamp(metadata.mergedAt) ??
      this._parseTimestamp(metadata.pushedAt) ??
      this._parseTimestamp(metadata.timestamp);

    if (!timestamp) {
      return 0.5; // Default mid-range for documents without timestamps
    }

    const ageHours = (now - timestamp) / (1000 * 60 * 60);
    const windowHours = this._recencyWindowHours;

    if (ageHours <= 0) return 1.0;
    if (ageHours >= windowHours) return 0.0;

    // Linear decay within window
    return 1.0 - ageHours / windowHours;
  }

  /**
   * Parse various timestamp formats
   */
  private _parseTimestamp(value: unknown): number | null {
    if (!value) return null;

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    return null;
  }
}

/**
 * Singleton instance for performance
 */
let _instance: FastRerankService | null = null;

export function getFastRerankService(config?: FastRerankConfig): FastRerankService {
  if (!_instance) {
    _instance = new FastRerankService(config);
  }
  return _instance;
}

export function resetFastRerankService(): void {
  _instance = null;
}
