import type { IntegrationVendor } from "./entities.config";

export type EntityType =
  | "spotify_track"
  | "spotify_artist"
  | "spotify_playlist"
  | "spotify_album"
  | "spotify_recently_played"
  | "github_repository"
  | "github_pull_request"
  | "github_commit"
  | "github_file"
  | "linear_issue"
  | "x_tweet"
  | "notion_page"
  | "slack_message"
  | "google_calendar_event"
  | "google_calendar_calendar"
  | "google_youtube_subscription"
  | "google_contact"
  | "google_photo";

export const VALID_ENTITY_TYPES: readonly EntityType[] = [
  "spotify_track",
  "spotify_artist",
  "spotify_playlist",
  "spotify_album",
  "spotify_recently_played",
  "github_repository",
  "github_pull_request",
  "github_commit",
  "github_file",
  "x_tweet",
  "linear_issue",
  "notion_page",
  "slack_message",
  "google_calendar_event",
  "google_calendar_calendar",
  "google_youtube_subscription",
  "google_contact",
  "google_photo",
] as const;

export type IntegrationEntity = Record<string, any> & {
  id: string | number;
  __type: EntityType;
};

export interface FeedRequirement {
  vendor: IntegrationVendor;
  entityType: EntityType;
  limit: number;
}
