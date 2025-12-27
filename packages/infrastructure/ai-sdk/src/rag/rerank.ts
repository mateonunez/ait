import { getLogger } from "@ait/core";
import type { RetrievedDocument } from "./retrieve";

const logger = getLogger();

export interface RerankOptions {
  query: string;
  documents: RetrievedDocument[];
  topK?: number;
  diversityBias?: number;
}

export interface RerankResult {
  documents: RetrievedDocument[];
  originalCount: number;
}

/**
 * Rerank documents based on relevance to query.
 * Implements fast keyword-based reranking with optional diversity.
 */
export function rerank(options: RerankOptions): RerankResult {
  const { query, documents, topK = 10, diversityBias = 0.1 } = options;
  const originalCount = documents.length;

  if (documents.length === 0) {
    return { documents: [], originalCount: 0 };
  }

  logger.info("Reranking documents", { query: query.slice(0, 50), count: documents.length });

  // Extract query keywords
  const queryTerms = extractKeywords(query);

  // Score documents by keyword overlap + original score
  const scoredDocs = documents.map((doc) => {
    const docTerms = extractKeywords(doc.content);
    const keywordScore = calculateKeywordOverlap(queryTerms, docTerms);
    const combinedScore = doc.score * 0.7 + keywordScore * 0.3;
    return { ...doc, rerankScore: combinedScore };
  });

  // Sort by combined score
  scoredDocs.sort((a, b) => b.rerankScore - a.rerankScore);

  // Apply diversity if enabled
  let finalDocs: RetrievedDocument[];
  if (diversityBias > 0) {
    finalDocs = applyDiversity(scoredDocs, topK, diversityBias);
  } else {
    finalDocs = scoredDocs.slice(0, topK);
  }

  logger.info("Reranked documents", { originalCount, finalCount: finalDocs.length });

  return {
    documents: finalDocs,
    originalCount,
  };
}

function extractKeywords(text: string): Set<string> {
  const stopwords = new Set([
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "shall",
    "can",
    "need",
    "dare",
    "ought",
    "used",
    "to",
    "of",
    "in",
    "for",
    "on",
    "with",
    "at",
    "by",
    "from",
    "as",
    "into",
    "and",
    "but",
    "or",
    "nor",
    "so",
    "yet",
    "both",
    "either",
    "i",
    "me",
    "my",
    "we",
    "our",
    "you",
    "your",
    "it",
    "its",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopwords.has(word)),
  );
}

function calculateKeywordOverlap(queryTerms: Set<string>, docTerms: Set<string>): number {
  if (queryTerms.size === 0) return 0;

  let overlap = 0;
  for (const term of queryTerms) {
    if (docTerms.has(term)) overlap++;
  }

  return overlap / queryTerms.size;
}

function applyDiversity(
  docs: Array<RetrievedDocument & { rerankScore: number }>,
  topK: number,
  diversityBias: number,
): RetrievedDocument[] {
  const selected: RetrievedDocument[] = [];
  const remaining = [...docs];
  const seenCollections = new Set<string>();

  while (selected.length < topK && remaining.length > 0) {
    // Find best candidate with diversity penalty
    let bestIdx = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const doc = remaining[i];
      if (!doc) continue;
      let score = doc.rerankScore;

      // Penalize if collection already represented
      if (seenCollections.has(doc.collection)) {
        score *= 1 - diversityBias;
      }

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const chosen = remaining.splice(bestIdx, 1)[0];
    if (chosen) {
      selected.push(chosen);
      seenCollections.add(chosen.collection);
    }
  }

  return selected;
}
