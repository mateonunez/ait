import type { ITextTokenizer } from "./text-tokenizer.interface";

/**
 * Default text tokenizer for natural language content.
 * Splits text on whitespace and filters short words.
 */
export class DefaultTextTokenizer implements ITextTokenizer {
  private readonly _minTokenLength: number;

  constructor(minTokenLength = 2) {
    this._minTokenLength = minTokenLength;
  }

  tokenize(text: string): Set<string> {
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > this._minTokenLength);

    return new Set(tokens);
  }

  getName(): "default" {
    return "default";
  }
}
