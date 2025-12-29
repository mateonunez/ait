import type { EntityType } from "@ait/core";
import type { ITextTokenizer } from "./text-tokenizer.interface";

/**
 * Code-aware text tokenizer for source code content (repository_file, commit, pull_request).
 * Handles camelCase, snake_case, kebab-case, and PascalCase splitting.
 */
export class RepositoryFileTextTokenizer implements ITextTokenizer {
  private readonly _minTokenLength: number;

  constructor(minTokenLength = 1) {
    this._minTokenLength = minTokenLength;
  }

  tokenize(text: string): Set<string> {
    const tokens = new Set<string>();

    // Split on whitespace first
    const words = text.split(/\s+/);

    for (const word of words) {
      // Add the original word (lowercase)
      const lowerWord = word.toLowerCase();
      if (lowerWord.length > this._minTokenLength) {
        tokens.add(lowerWord);
      }

      // Split camelCase/PascalCase: "getUserById" → ["get", "User", "By", "Id"]
      const camelParts = word.replace(/([a-z])([A-Z])/g, "$1 $2").split(/\s+/);
      for (const part of camelParts) {
        const lowerPart = part.toLowerCase();
        if (lowerPart.length > this._minTokenLength) {
          tokens.add(lowerPart);
        }
      }

      // Split snake_case: "get_user_by_id" → ["get", "user", "by", "id"]
      const snakeParts = word.split(/_+/);
      for (const part of snakeParts) {
        const lowerPart = part.toLowerCase();
        if (lowerPart.length > this._minTokenLength) {
          tokens.add(lowerPart);
        }
      }

      // Split kebab-case: "get-user-by-id" → ["get", "user", "by", "id"]
      const kebabParts = word.split(/-+/);
      for (const part of kebabParts) {
        const lowerPart = part.toLowerCase();
        if (lowerPart.length > this._minTokenLength) {
          tokens.add(lowerPart);
        }
      }
    }

    return tokens;
  }

  getName(): EntityType {
    return "github_file";
  }
}
