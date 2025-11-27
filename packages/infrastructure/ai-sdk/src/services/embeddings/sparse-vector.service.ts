export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface ISparseVectorService {
  generateSparseVector(text: string): SparseVector;
  getVocabularySize(): number;
}

export class SparseVectorService implements ISparseVectorService {
  private readonly _stopWords: Set<string>;
  private readonly _vocabulary: Map<string, number> = new Map();
  private readonly _documentFrequency: Map<string, number> = new Map();
  private _documentCount = 0;

  // BM25 parameters
  private readonly _k1: number;
  private readonly _b: number;
  private readonly _avgDocLength: number;

  constructor(options?: { k1?: number; b?: number; avgDocLength?: number }) {
    this._k1 = options?.k1 ?? 1.2;
    this._b = options?.b ?? 0.75;
    this._avgDocLength = options?.avgDocLength ?? 100;

    // Common English stop words
    this._stopWords = new Set([
      "a",
      "an",
      "and",
      "are",
      "as",
      "at",
      "be",
      "by",
      "for",
      "from",
      "has",
      "he",
      "in",
      "is",
      "it",
      "its",
      "of",
      "on",
      "or",
      "that",
      "the",
      "to",
      "was",
      "were",
      "will",
      "with",
      "i",
      "me",
      "my",
      "we",
      "our",
      "you",
      "your",
      "this",
      "these",
      "those",
      "have",
      "had",
      "do",
      "does",
      "did",
      "been",
      "being",
      "am",
      "which",
      "who",
      "whom",
      "what",
      "when",
      "where",
      "why",
      "how",
      "all",
      "each",
      "every",
      "both",
      "few",
      "more",
      "most",
      "other",
      "some",
      "such",
      "no",
      "nor",
      "not",
      "only",
      "own",
      "same",
      "so",
      "than",
      "too",
      "very",
      "can",
      "just",
      "should",
      "now",
    ]);
  }

  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !this._stopWords.has(token) && !/^\d+$/.test(token));
  }

  private _getTermIndex(term: string): number {
    if (!this._vocabulary.has(term)) {
      this._vocabulary.set(term, this._vocabulary.size);
    }
    return this._vocabulary.get(term)!;
  }

  private _calculateBM25Weight(termFreq: number, docLength: number): number {
    const numerator = termFreq * (this._k1 + 1);
    const denominator = termFreq + this._k1 * (1 - this._b + this._b * (docLength / this._avgDocLength));
    return numerator / denominator;
  }

  public generateSparseVector(text: string): SparseVector {
    const tokens = this._tokenize(text);
    const docLength = tokens.length;

    // Count term frequencies
    const termFreqs = new Map<string, number>();
    for (const token of tokens) {
      termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
    }

    // Generate sparse vector
    const indices: number[] = [];
    const values: number[] = [];

    for (const [term, freq] of termFreqs) {
      const index = this._getTermIndex(term);
      const weight = this._calculateBM25Weight(freq, docLength);

      indices.push(index);
      values.push(weight);
    }

    // Sort by index for consistent representation
    const sortedPairs = indices.map((idx, i) => ({ index: idx, value: values[i]! })).sort((a, b) => a.index - b.index);

    return {
      indices: sortedPairs.map((p) => p.index),
      values: sortedPairs.map((p) => p.value),
    };
  }

  /**
   * Get current vocabulary size.
   */
  public getVocabularySize(): number {
    return this._vocabulary.size;
  }

  /**
   * Update document statistics (for IDF calculation in more advanced implementations).
   */
  public updateDocumentStats(text: string): void {
    const tokens = new Set(this._tokenize(text));
    this._documentCount++;

    for (const token of tokens) {
      this._documentFrequency.set(token, (this._documentFrequency.get(token) || 0) + 1);
    }
  }
}

// Singleton instance
let _sparseVectorService: ISparseVectorService | null = null;

export function getSparseVectorService(): ISparseVectorService {
  if (!_sparseVectorService) {
    _sparseVectorService = new SparseVectorService();
  }
  return _sparseVectorService;
}

export function resetSparseVectorService(): void {
  _sparseVectorService = null;
}
