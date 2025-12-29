import type { EntityType } from "@ait/core";
import { RepositoryFileTextTokenizer } from "./code-text.tokenizer";
import { DefaultTextTokenizer } from "./default-text.tokenizer";
import type { ITextTokenizer } from "./text-tokenizer.interface";

const CODE_ENTITY_TYPES: EntityType[] = ["github_file", "github_commit", "github_pull_request", "github_repository"];

let _defaultTokenizer: DefaultTextTokenizer | null = null;
let _repositoryFileTokenizer: RepositoryFileTextTokenizer | null = null;
export function getTextTokenizer(entityType?: EntityType): ITextTokenizer {
  if (entityType && CODE_ENTITY_TYPES.includes(entityType)) {
    if (!_repositoryFileTokenizer) {
      _repositoryFileTokenizer = new RepositoryFileTextTokenizer();
    }
    return _repositoryFileTokenizer;
  }

  if (!_defaultTokenizer) {
    _defaultTokenizer = new DefaultTextTokenizer();
  }
  return _defaultTokenizer;
}

export function isCodeEntityType(entityType: EntityType): boolean {
  return CODE_ENTITY_TYPES.includes(entityType);
}

export function resetTextTokenizers(): void {
  _defaultTokenizer = null;
  _repositoryFileTokenizer = null;
}
