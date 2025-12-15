import type { EntityType } from "@ait/core";

/**
 * Strategy interface for text tokenization.
 * Implementations provide different tokenization approaches for various entity types.
 */
export interface ITextTokenizer {
  /**
   * Tokenize text into a set of unique, lowercase tokens.
   * @param text - The input text to tokenize
   * @returns Set of unique tokens
   */
  tokenize(text: string): Set<string>;

  /**
   * Get the name of this tokenizer strategy.
   */
  getName(): EntityType | "default";
}
