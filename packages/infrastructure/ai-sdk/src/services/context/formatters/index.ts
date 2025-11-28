import type { EntityType } from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import {
  SpotifyTrackFormatter,
  SpotifyArtistFormatter,
  SpotifyPlaylistFormatter,
  SpotifyAlbumFormatter,
  SpotifyRecentlyPlayedFormatter,
} from "./spotify.formatter";
import { GitHubRepositoryFormatter, GitHubPullRequestFormatter, GitHubCommitFormatter } from "./github.formatter";
import { XTweetFormatter } from "./x.formatter";
import { NotionPageFormatter } from "./notion.formatter";
import { SlackMessageFormatter } from "./slack.formatter";
import { LinearIssueFormatter } from "./linear.formatter";
import { GoogleCalendarEventFormatter, GoogleCalendarCalendarFormatter } from "./google-calendar.formatter";

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
};

export const getFormatter = (type: EntityType): EntityFormatter<unknown> | undefined => {
  return ENTITY_FORMATTERS[type];
};
