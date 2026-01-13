import type { IntegrationVendor } from "./entities.config";
import type { GitHubEntityType } from "./integrations/github";
import type { GoogleEntityType } from "./integrations/google";
import type { LinearEntityType } from "./integrations/linear";
import type { NotionEntityType } from "./integrations/notion";
import type { SlackEntityType } from "./integrations/slack";
import type { SpotifyEntityType } from "./integrations/spotify";
import type { XEntityType } from "./integrations/x";

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

export type IntegrationEntity =
  | SpotifyEntityType
  | GitHubEntityType
  | LinearEntityType
  | XEntityType
  | NotionEntityType
  | SlackEntityType
  | GoogleEntityType;

export interface FeedRequirement {
  vendor: IntegrationVendor;
  entityType: EntityType;
  limit: number;
}
