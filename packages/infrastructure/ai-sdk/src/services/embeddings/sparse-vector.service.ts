export interface SparseVector {
  indices: number[];
  values: number[];
}

export interface SparseVectorServiceOptions {
  /** BM25 k1 parameter (term frequency saturation), default: 1.2 */
  k1?: number;
  /** BM25 b parameter (length normalization), default: 0.75 */
  b?: number;
  /** Average document length for normalization, default: 100 */
  avgDocLength?: number;
  /** Maximum vocabulary size before pruning, default: unlimited */
  maxVocabularySize?: number;
  /** Enable automatic vocabulary pruning, default: false */
  enablePruning?: boolean;
  /** Minimum term frequency to keep in vocabulary during pruning, default: 2 */
  pruningThreshold?: number;
  /** Additional stop words to filter out */
  customStopWords?: string[];
  /** Minimum token length, default: 3 */
  minTokenLength?: number;
}

export interface ISparseVectorService {
  generateSparseVector(text: string): SparseVector;
  generateSparseVectorsBatch(texts: string[]): SparseVector[];
  getVocabularySize(): number;
  pruneVocabulary(): number;
  updateDocumentStats(text: string): void;
  getStats(): SparseVectorStats;
}

export interface SparseVectorStats {
  vocabularySize: number;
  documentCount: number;
  avgTermsPerDocument: number;
  totalTermsSeen: number;
}

// Default English stop words
const DEFAULT_STOP_WORDS = new Set([
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

export class SparseVectorService implements ISparseVectorService {
  private readonly _stopWords: Set<string>;
  private readonly _vocabulary: Map<string, number> = new Map();
  private readonly _termFrequency: Map<string, number> = new Map();
  private readonly _documentFrequency: Map<string, number> = new Map();
  private _documentCount = 0;
  private _totalTermsSeen = 0;

  // BM25 parameters
  private readonly _k1: number;
  private readonly _b: number;
  private readonly _avgDocLength: number;
  private readonly _maxVocabularySize?: number;
  private readonly _enablePruning: boolean;
  private readonly _pruningThreshold: number;
  private readonly _minTokenLength: number;

  constructor(options?: SparseVectorServiceOptions) {
    this._k1 = options?.k1 ?? 1.2;
    this._b = options?.b ?? 0.75;
    this._avgDocLength = options?.avgDocLength ?? 100;
    this._maxVocabularySize = options?.maxVocabularySize;
    this._enablePruning = options?.enablePruning ?? false;
    this._pruningThreshold = options?.pruningThreshold ?? 2;
    this._minTokenLength = options?.minTokenLength ?? 3;

    // Combine default and custom stop words
    this._stopWords = new Set([...DEFAULT_STOP_WORDS]);
    if (options?.customStopWords) {
      for (const word of options.customStopWords) {
        this._stopWords.add(word.toLowerCase());
      }
    }
  }

  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= this._minTokenLength && !this._stopWords.has(token) && !/^\d+$/.test(token));
  }

  private _getTermIndex(term: string): number {
    if (!this._vocabulary.has(term)) {
      // Check if we need to prune before adding
      if (this._enablePruning && this._maxVocabularySize && this._vocabulary.size >= this._maxVocabularySize) {
        this.pruneVocabulary();
      }
      this._vocabulary.set(term, this._vocabulary.size);
    }
    return this._vocabulary.get(term)!;
  }

  private _calculateBM25Weight(termFreq: number, docLength: number): number {
    const numerator = termFreq * (this._k1 + 1);
    const denominator = termFreq + this._k1 * (1 - this._b + this._b * (docLength / this._avgDocLength));
    return numerator / denominator;
  }

  private _calculateIDF(term: string): number {
    if (this._documentCount === 0) {
      return 1.0; // Default IDF when no documents have been indexed
    }
    const docFreq = this._documentFrequency.get(term) || 0;
    if (docFreq === 0) {
      return 1.0;
    }
    // Standard IDF formula: log((N - df + 0.5) / (df + 0.5))
    return Math.log((this._documentCount - docFreq + 0.5) / (docFreq + 0.5) + 1);
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
      const bm25Weight = this._calculateBM25Weight(freq, docLength);
      const idf = this._calculateIDF(term);
      const weight = bm25Weight * idf;

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
   * Generate sparse vectors for multiple texts efficiently.
   * Shares vocabulary and document frequency calculations.
   */
  public generateSparseVectorsBatch(texts: string[]): SparseVector[] {
    return texts.map((text) => this.generateSparseVector(text));
  }

  /**
   * Get current vocabulary size.
   */
  public getVocabularySize(): number {
    return this._vocabulary.size;
  }

  /**
   * Prune vocabulary by removing low-frequency terms.
   * Returns the number of terms removed.
   */
  public pruneVocabulary(): number {
    const termsToPrune: string[] = [];

    for (const [term] of this._vocabulary) {
      const freq = this._termFrequency.get(term) || 0;
      if (freq < this._pruningThreshold) {
        termsToPrune.push(term);
      }
    }

    // Remove pruned terms and rebuild vocabulary indices
    for (const term of termsToPrune) {
      this._vocabulary.delete(term);
      this._termFrequency.delete(term);
      this._documentFrequency.delete(term);
    }

    // Rebuild indices to be contiguous
    let newIndex = 0;
    for (const term of this._vocabulary.keys()) {
      this._vocabulary.set(term, newIndex++);
    }

    return termsToPrune.length;
  }

  /**
   * Update document statistics (for IDF calculation).
   */
  public updateDocumentStats(text: string): void {
    const tokens = new Set(this._tokenize(text));
    this._documentCount++;

    for (const token of tokens) {
      this._documentFrequency.set(token, (this._documentFrequency.get(token) || 0) + 1);
      this._termFrequency.set(token, (this._termFrequency.get(token) || 0) + 1);
      this._totalTermsSeen++;
    }
  }

  /**
   * Get statistics about the sparse vector service.
   */
  public getStats(): SparseVectorStats {
    return {
      vocabularySize: this._vocabulary.size,
      documentCount: this._documentCount,
      avgTermsPerDocument: this._documentCount > 0 ? this._totalTermsSeen / this._documentCount : 0,
      totalTermsSeen: this._totalTermsSeen,
    };
  }
}

// Singleton instance
let _sparseVectorService: ISparseVectorService | null = null;

export function getSparseVectorService(options?: SparseVectorServiceOptions): ISparseVectorService {
  if (!_sparseVectorService) {
    _sparseVectorService = new SparseVectorService(options);
  }
  return _sparseVectorService;
}

export function resetSparseVectorService(): void {
  _sparseVectorService = null;
}
