/**
 * EntityType represents all possible entity types across all integrations.
 * This is the single source of truth for entity type definitions.
 */
export type EntityType =
  | "track"
  | "artist"
  | "playlist"
  | "album"
  | "recently_played"
  | "repository"
  | "pull_request"
  | "issue"
  | "tweet"
  | "page"
  | "message";

/**
 * Valid entity types array - use this for runtime validation.
 */
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
  "page",
  "message",
] as const;
