import type { EntityType, IntegrationEntity, PaginationMeta } from "@ait/core";

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
