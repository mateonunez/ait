import type { EntityType } from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import { GitHubCommitFormatter, GitHubPullRequestFormatter, GitHubRepositoryFormatter } from "./github.formatter";
import { GoogleCalendarCalendarFormatter, GoogleCalendarEventFormatter } from "./google-calendar.formatter";
import { GoogleYouTubeSubscriptionFormatter } from "./google-youtube.formatter";
import { LinearIssueFormatter } from "./linear.formatter";
import { NotionPageFormatter } from "./notion.formatter";
import { SlackMessageFormatter } from "./slack.formatter";
import {
  SpotifyAlbumFormatter,
  SpotifyArtistFormatter,
  SpotifyPlaylistFormatter,
  SpotifyRecentlyPlayedFormatter,
  SpotifyTrackFormatter,
} from "./spotify.formatter";
import { XTweetFormatter } from "./x.formatter";

export {
  SpotifyTrackFormatter,
  SpotifyArtistFormatter,
  SpotifyPlaylistFormatter,
  SpotifyAlbumFormatter,
  SpotifyRecentlyPlayedFormatter,
} from "./spotify.formatter";
export { XTweetFormatter } from "./x.formatter";
export { NotionPageFormatter } from "./notion.formatter";
export { SlackMessageFormatter } from "./slack.formatter";
export { GitHubRepositoryFormatter, GitHubPullRequestFormatter, GitHubCommitFormatter } from "./github.formatter";
export { LinearIssueFormatter } from "./linear.formatter";
export { GoogleCalendarEventFormatter, GoogleCalendarCalendarFormatter } from "./google-calendar.formatter";
export { GoogleYouTubeSubscriptionFormatter } from "./google-youtube.formatter";
export type { EntityFormatter } from "./formatter.utils";
export { safeString, safeNumber, safeArray, joinParts, extractArtistName, formatDate } from "./formatter.utils";

export const ENTITY_FORMATTERS: Record<EntityType, EntityFormatter<unknown>> = {
  track: SpotifyTrackFormatter,
  artist: SpotifyArtistFormatter,
  playlist: SpotifyPlaylistFormatter,
  album: SpotifyAlbumFormatter,
  recently_played: SpotifyRecentlyPlayedFormatter,
  repository: GitHubRepositoryFormatter,
  pull_request: GitHubPullRequestFormatter,
  commit: GitHubCommitFormatter,
  tweet: XTweetFormatter,
  issue: LinearIssueFormatter,
  page: NotionPageFormatter,
  message: SlackMessageFormatter,
  event: GoogleCalendarEventFormatter,
  calendar: GoogleCalendarCalendarFormatter,
  subscription: GoogleYouTubeSubscriptionFormatter,
};

export const getFormatter = (type: EntityType): EntityFormatter<unknown> | undefined => {
  return ENTITY_FORMATTERS[type];
};
