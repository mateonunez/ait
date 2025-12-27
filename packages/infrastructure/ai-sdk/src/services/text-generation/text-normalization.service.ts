export interface ITextNormalizationService {
  normalizeForMatching(text: string): string;
  cleanPageContent(content: string): string;
  isNaturalText(text: string): boolean;
  truncate(text: string, maxLength: number): string;
  extractKeywords(text: string): Set<string>;
}

export class TextNormalizationService implements ITextNormalizationService {
  private readonly _minNaturalTextLength: number;

  constructor(minNaturalTextLength = 10) {
    this._minNaturalTextLength = Math.max(minNaturalTextLength, 1);
  }

  normalizeForMatching(text: string): string {
    if (!text) return "";

    return text
      .toLowerCase()
      .replace(/["'`]/g, "")
      .replace(/[.,;:!?(){}\[\]\\/+*_#@%^&=<>|~]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  cleanPageContent(content: string): string {
    if (!content) return "";

    return content
      .replace(/\{[^}]*\}/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/https?:\/\/[^\s]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  isNaturalText(text: string): boolean {
    if (!text) return false;

    return text.length > this._minNaturalTextLength && !text.includes("{") && !text.includes("http");
  }

  truncate(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  }

  extractKeywords(text: string): Set<string> {
    if (!text) return new Set();

    const keywords = new Set<string>();
    const normalized = this.normalizeForMatching(text);
    if (normalized) {
      keywords.add(normalized);
    }

    const tokens = normalized.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      if (token.length > 1) {
        // Skip single-character tokens
        keywords.add(token);
      }
    }

    return keywords;
  }
}
