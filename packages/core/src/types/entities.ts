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
  | "message"
  | "event"
  | "calendar";

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
  "event",
  "calendar",
] as const;
