import type {
  EntityType,
  GitHubEntity,
  GoogleEntity,
  LinearEntity,
  NotionEntity,
  PaginationMeta,
  SlackEntity,
  SpotifyEntity,
  XEntity,
} from "@ait/core";

/**
 * Union of all integration entity types.
 * Composed from vendor-specific union types defined in @ait/core.
 */
export type IntegrationEntity =
  | SpotifyEntity
  | GitHubEntity
  | LinearEntity
  | XEntity
  | NotionEntity
  | SlackEntity
  | GoogleEntity;

export interface CachedEntityData {
  data: IntegrationEntity[];
  pagination: PaginationMeta;
  lastFetched: Date;
}

export type CachedIntegrationData = Record<string, Record<string, CachedEntityData>>;

export interface HomeSection {
  id: string;
  title: string;
  entityTypes: EntityType[];
  variant?: "scroll" | "grid" | "bento";
  viewAllHref?: string;
}

export interface ContentAlgorithmResult {
  items: IntegrationEntity[];
  sections: Array<{
    sectionId: string;
    items: IntegrationEntity[];
  }>;
}
