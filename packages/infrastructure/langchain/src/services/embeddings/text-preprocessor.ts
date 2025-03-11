import type { EmbeddingsConfig } from "./embeddings.config";

export interface TextChunk {
  content: string;
  length: number;
  index: number;
}

export class TextPreprocessor {
  constructor(private readonly config: EmbeddingsConfig) {}

  /**
   * Normalizes text by removing extra whitespace and optionally performing other cleanup
   */
  public normalizeText(text: string): string {
    if (!this.config.normalizeText) return text;

    return text
      .trim()
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .replace(/[\r\n]+/g, "\n"); // Normalize line endings
  }

  /**
   * Splits text into chunks while preserving sentence boundaries when possible
   */
  public chunkText(text: string): TextChunk[] {
    const normalizedText = this.normalizeText(text);

    if (!normalizedText || normalizedText.length <= this.config.chunkSize) {
      return [{ content: normalizedText, length: normalizedText.length, index: 0 }];
    }

    const chunks: TextChunk[] = [];

    if (this.config.preserveSentences) {
      // Split on sentence boundaries while respecting chunk size
      const sentences = normalizedText.split(/(?<=[.!?])\s+/);
      let currentChunk = "";
      let chunkStartIndex = 0;

      for (const sentence of sentences) {
        if (`${currentChunk} ${sentence}`.trim().length <= this.config.chunkSize) {
          currentChunk = `${currentChunk} ${sentence}`.trim();
        } else {
          if (currentChunk) {
            chunks.push({
              content: currentChunk,
              length: currentChunk.length,
              index: chunks.length,
            });
          }
          currentChunk = sentence;
          chunkStartIndex += currentChunk.length;
        }
      }

      if (currentChunk) {
        chunks.push({
          content: currentChunk,
          length: currentChunk.length,
          index: chunks.length,
        });
      }
    } else {
      // Simple character-based chunking with overlap
      let start = 0;
      while (start < normalizedText.length) {
        const end = Math.min(start + this.config.chunkSize, normalizedText.length);
        const chunk = normalizedText.slice(start, end);

        chunks.push({
          content: chunk,
          length: chunk.length,
          index: chunks.length,
        });

        if (end === normalizedText.length) break;

        // Calculate next start position with overlap
        let newStart = end - this.config.chunkOverlap;
        if (newStart <= start) {
          newStart = start + 1;
        }
        start = newStart;
      }
    }

    return chunks;
  }

  /**
   * Validates that chunks can be recombined to approximate the original text
   */
  public validateChunks(chunks: TextChunk[], originalText: string): boolean {
    if (chunks.length === 0) return false;

    const normalizedOriginal = this.normalizeText(originalText);
    const recombined = chunks.map((c) => c.content).join(" ");
    const normalizedRecombined = this.normalizeText(recombined);

    // Check if the recombined text approximately matches the original
    // We use approximate matching since chunking may introduce some whitespace changes
    return Math.abs(normalizedOriginal.length - normalizedRecombined.length) < this.config.chunkOverlap;
  }
}
