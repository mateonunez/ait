export type EntityType =
  | "track"
  | "artist"
  | "playlist"
  | "album"
  | "recently_played"
  | "repository"
  | "pull_request"
  | "commit"
  | "issue"
  | "tweet"
  | "page"
  | "message";

export const VALID_ENTITY_TYPES: readonly EntityType[] = [
  "track",
  "artist",
  "playlist",
  "album",
  "recently_played",
  "repository",
  "pull_request",
  "commit",
  "tweet",
  "issue",
  "page",
  "message",
] as const;
