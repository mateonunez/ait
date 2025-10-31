import type { EmbeddingsConfig } from "./embeddings.config";

export interface TextChunk {
  content: string;
  length: number;
  index: number;
}

export class TextPreprocessor {
  constructor(private readonly config: EmbeddingsConfig) {}

  public normalizeText(text: string): string {
    if (!this.config.normalizeText) return text;

    return text
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\r\n]+/g, "\n");
  }

  public chunkText(text: string): TextChunk[] {
    const normalizedText = this.normalizeText(text);

    if (!normalizedText || normalizedText.length <= this.config.chunkSize) {
      return [{ content: normalizedText, length: normalizedText.length, index: 0 }];
    }

    const chunks: TextChunk[] = [];

    if (this.config.preserveSentences) {
      const sentences = normalizedText.split(/(?<=[.!?])\s+/);
      let sentenceBuffer: string[] = [];
      let bufferLength = 0;

      for (const sentence of sentences) {
        const newLength = bufferLength + sentence.length + (sentenceBuffer.length > 0 ? 1 : 0);

        if (newLength <= this.config.chunkSize) {
          sentenceBuffer.push(sentence);
          bufferLength = newLength;
        } else {
          if (sentenceBuffer.length > 0) {
            chunks.push({
              content: sentenceBuffer.join(" "),
              length: bufferLength,
              index: chunks.length,
            });
          }

          const overlapSentences: string[] = [];
          let overlapLength = 0;
          for (let i = sentenceBuffer.length - 1; i >= 0; i--) {
            const sentenceLen = sentenceBuffer[i]?.length ?? 0 + (overlapSentences.length > 0 ? 1 : 0);
            if (overlapLength + sentenceLen <= this.config.chunkOverlap) {
              overlapSentences.unshift(sentenceBuffer[i]!);
              overlapLength += sentenceLen;
            } else {
              break;
            }
          }

          sentenceBuffer = [...overlapSentences, sentence];
          bufferLength = overlapLength + sentence.length + (overlapSentences.length > 0 ? 1 : 0);
        }
      }

      if (sentenceBuffer.length > 0) {
        chunks.push({
          content: sentenceBuffer.join(" "),
          length: bufferLength,
          index: chunks.length,
        });
      }
    } else {
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

        let newStart = end - this.config.chunkOverlap;
        if (newStart <= start) {
          newStart = start + 1;
        }
        start = newStart;
      }
    }

    return chunks;
  }

  public validateChunks(chunks: TextChunk[], originalText: string): boolean {
    if (chunks.length === 0) return false;

    const normalizedOriginal = this.normalizeText(originalText);
    const recombined = chunks.map((c) => c.content).join(" ");
    const normalizedRecombined = this.normalizeText(recombined);

    const tolerance = Math.max(normalizedOriginal.length * 0.1, this.config.chunkOverlap * chunks.length);

    return Math.abs(normalizedOriginal.length - normalizedRecombined.length) < tolerance;
  }
}
