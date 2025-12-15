export type EntityType =
  | "track"
  | "artist"
  | "playlist"
  | "album"
  | "recently_played"
  | "repository"
  | "pull_request"
  | "commit"
  | "repository_file"
  | "issue"
  | "tweet"
  | "page"
  | "message"
  | "event"
  | "calendar"
  | "subscription";

export const VALID_ENTITY_TYPES: readonly EntityType[] = [
  "track",
  "artist",
  "playlist",
  "album",
  "recently_played",
  "repository",
  "pull_request",
  "commit",
  "repository_file",
  "tweet",
  "issue",
  "page",
  "message",
  "event",
  "calendar",
  "subscription",
] as const;
