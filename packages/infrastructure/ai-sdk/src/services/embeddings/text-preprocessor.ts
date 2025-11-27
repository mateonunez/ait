import type { EmbeddingsConfig } from "./embeddings.config";

export interface TextChunk {
  content: string;
  length: number;
  index: number;
  startOffset?: number;
  endOffset?: number;
}

export class TextPreprocessor {
  constructor(private readonly config: EmbeddingsConfig) {}

  public normalizeText(text: string): string {
    if (!this.config.normalizeText) return text;

    return text
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[\r\n]+/g, " "); // Normalize newlines to spaces for embedding
  }

  public chunkText(text: string): TextChunk[] {
    const normalizedText = this.normalizeText(text);

    if (!normalizedText || normalizedText.length <= this.config.chunkSize) {
      return [
        {
          content: normalizedText,
          length: normalizedText.length,
          index: 0,
          startOffset: 0,
          endOffset: normalizedText.length,
        },
      ];
    }

    const chunks: TextChunk[] = [];

    if (this.config.preserveSentences) {
      const sentences = this._splitIntoSentences(normalizedText);
      let sentenceBuffer: string[] = [];
      let bufferLength = 0;
      let currentOffset = 0;

      for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        const newLength = bufferLength + trimmedSentence.length + (sentenceBuffer.length > 0 ? 1 : 0);

        if (newLength <= this.config.chunkSize) {
          sentenceBuffer.push(trimmedSentence);
          bufferLength = newLength;
        } else {
          // Flush current buffer
          if (sentenceBuffer.length > 0) {
            const content = sentenceBuffer.join(" ");
            chunks.push({
              content,
              length: content.length,
              index: chunks.length,
              startOffset: currentOffset,
              endOffset: currentOffset + content.length,
            });
            currentOffset += content.length;
          }

          // Calculate overlap from end of previous buffer
          const overlapSentences: string[] = [];
          let overlapLength = 0;
          for (let i = sentenceBuffer.length - 1; i >= 0; i--) {
            const sentenceLen = (sentenceBuffer[i]?.length ?? 0) + (overlapSentences.length > 0 ? 1 : 0);
            if (overlapLength + sentenceLen <= this.config.chunkOverlap) {
              overlapSentences.unshift(sentenceBuffer[i]!);
              overlapLength += sentenceLen;
            } else {
              break;
            }
          }

          // Handle case where single sentence exceeds chunk size
          if (trimmedSentence.length > this.config.chunkSize) {
            const subChunks = this._chunkLongText(trimmedSentence);
            for (const subChunk of subChunks) {
              chunks.push({
                content: subChunk,
                length: subChunk.length,
                index: chunks.length,
                startOffset: currentOffset,
                endOffset: currentOffset + subChunk.length,
              });
              currentOffset += subChunk.length;
            }
            sentenceBuffer = [];
            bufferLength = 0;
          } else {
            sentenceBuffer = [...overlapSentences, trimmedSentence];
            bufferLength = overlapLength + trimmedSentence.length + (overlapSentences.length > 0 ? 1 : 0);
          }
        }
      }

      // Flush remaining buffer
      if (sentenceBuffer.length > 0) {
        const content = sentenceBuffer.join(" ");
        chunks.push({
          content,
          length: content.length,
          index: chunks.length,
          startOffset: currentOffset,
          endOffset: currentOffset + content.length,
        });
      }
    } else {
      // Word-boundary chunking fallback
      const subChunks = this._chunkLongText(normalizedText);
      let offset = 0;
      for (const subChunk of subChunks) {
        chunks.push({
          content: subChunk,
          length: subChunk.length,
          index: chunks.length,
          startOffset: offset,
          endOffset: offset + subChunk.length,
        });
        offset += subChunk.length;
      }
    }

    return chunks;
  }

  private _splitIntoSentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  }

  private _chunkLongText(text: string): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);
    let currentChunk: string[] = [];
    let currentLength = 0;

    for (const word of words) {
      const wordWithSpace = currentChunk.length > 0 ? word.length + 1 : word.length;

      if (currentLength + wordWithSpace <= this.config.chunkSize) {
        currentChunk.push(word);
        currentLength += wordWithSpace;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.join(" "));
        }

        // Start new chunk with overlap
        const overlapWords: string[] = [];
        let overlapLength = 0;
        for (let i = currentChunk.length - 1; i >= 0; i--) {
          const wordLen = (currentChunk[i]?.length ?? 0) + (overlapWords.length > 0 ? 1 : 0);
          if (overlapLength + wordLen <= this.config.chunkOverlap) {
            overlapWords.unshift(currentChunk[i]!);
            overlapLength += wordLen;
          } else {
            break;
          }
        }

        currentChunk = [...overlapWords, word];
        currentLength = overlapLength + word.length + (overlapWords.length > 0 ? 1 : 0);
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
    }

    return chunks;
  }

  public validateChunks(chunks: TextChunk[], originalText: string): boolean {
    if (chunks.length === 0) return false;

    const normalizedOriginal = this.normalizeText(originalText);
    const recombined = chunks.map((c) => c.content).join(" ");
    const normalizedRecombined = this.normalizeText(recombined);

    const tolerance = Math.max(normalizedOriginal.length * 0.15, this.config.chunkOverlap * chunks.length);

    return Math.abs(normalizedOriginal.length - normalizedRecombined.length) < tolerance;
  }
}
