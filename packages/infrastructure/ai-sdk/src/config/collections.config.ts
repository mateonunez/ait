export type CollectionVendor = "spotify" | "github" | "linear" | "x" | "general";

export type EntityType =
  | "track"
  | "artist"
  | "playlist"
  | "album"
  | "recently_played"
  | "repository"
  | "pull_request"
  | "issue"
  | "tweet";

export const VALID_ENTITY_TYPES: readonly EntityType[] = [
  "track",
  "artist",
  "playlist",
  "album",
  "recently_played",
  "repository",
  "pull_request",
  "tweet",
  "issue",
] as const;

export interface CollectionConfig {
  readonly vendor: CollectionVendor;
  readonly name: string;
  readonly description: string;
  readonly entityTypes: readonly EntityType[];
  readonly defaultWeight: number;
  readonly enabled: boolean;
}

const SPOTIFY_COLLECTION: CollectionConfig = {
  vendor: "spotify",
  name: "ait_spotify_collection",
  description: "Spotify music data including tracks, artists, playlists, albums, and listening history",
  entityTypes: ["track", "artist", "playlist", "album", "recently_played"],
  defaultWeight: 1.0,
  enabled: true,
};

const GITHUB_COLLECTION: CollectionConfig = {
  vendor: "github",
  name: "ait_github_collection",
  description: "GitHub repositories, pull requests, issues, and code-related activities",
  entityTypes: ["repository", "pull_request"],
  defaultWeight: 1.0,
  enabled: true,
};

const LINEAR_COLLECTION: CollectionConfig = {
  vendor: "linear",
  name: "ait_linear_collection",
  description: "Linear issues, tasks, and project management data",
  entityTypes: ["issue"],
  defaultWeight: 1.0,
  enabled: true,
};

const X_COLLECTION: CollectionConfig = {
  vendor: "x",
  name: "ait_x_collection",
  description: "X (Twitter) tweets, posts, and social media activity",
  entityTypes: ["tweet"],
  defaultWeight: 1.0,
  enabled: true,
};

const GENERAL_COLLECTION: CollectionConfig = {
  vendor: "general",
  name: "ait_general_collection",
  description: "General purpose collection for miscellaneous data and cross-domain information",
  entityTypes: [],
  defaultWeight: 0.8,
  enabled: true,
};

export const COLLECTIONS_REGISTRY: Record<CollectionVendor, CollectionConfig> = {
  spotify: SPOTIFY_COLLECTION,
  github: GITHUB_COLLECTION,
  linear: LINEAR_COLLECTION,
  x: X_COLLECTION,
  general: GENERAL_COLLECTION,
};

export function getCollectionConfig(vendor: CollectionVendor): CollectionConfig {
  const config = COLLECTIONS_REGISTRY[vendor];
  if (!config) {
    throw new Error(`Collection configuration not found for vendor: ${vendor}`);
  }
  return config;
}

export function getAllCollections(): ReadonlyArray<CollectionConfig> {
  return Object.values(COLLECTIONS_REGISTRY).filter((c) => c.enabled);
}

export function getCollectionsNames(): string[] {
  return getAllCollections().map((c) => c.name);
}

export function getCollectionByEntityType(entityType: EntityType): CollectionConfig | undefined {
  return Object.values(COLLECTIONS_REGISTRY).find((config) => config.entityTypes.includes(entityType));
}

export function getCollectionsByEntityTypes(entityTypes: EntityType[]): ReadonlyArray<CollectionConfig> {
  const collections = new Set<CollectionConfig>();

  for (const entityType of entityTypes) {
    const collection = getCollectionByEntityType(entityType);
    if (collection) {
      collections.add(collection);
    }
  }

  return Array.from(collections);
}

export function isValidCollectionVendor(vendor: string): vendor is CollectionVendor {
  return vendor in COLLECTIONS_REGISTRY;
}

export function getCollectionNameByVendor(vendor: CollectionVendor): string {
  return getCollectionConfig(vendor).name;
}

export function getCollectionNameByEntityType(entityType: EntityType): string {
  const collection = getCollectionByEntityType(entityType);
  if (!collection) {
    throw new Error(`Collection not found for entity type: ${entityType}`);
  }
  return collection.name;
}

export function getCollectionVendorByName(collectionName: string): CollectionVendor | undefined {
  const entry = Object.entries(COLLECTIONS_REGISTRY).find(([, config]) => config.name === collectionName);
  return entry ? (entry[0] as CollectionVendor) : undefined;
}
