import type {
  EntityType,
  PaginationMeta,
  SpotifyTrackEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyAlbumEntity,
  SpotifyRecentlyPlayedEntity,
  GitHubRepositoryEntity,
  GitHubPullRequestEntity,
  GitHubCommitEntity,
  LinearIssueEntity,
  XTweetEntity,
  NotionPageEntity,
  SlackMessageEntity,
  GoogleCalendarEventEntity,
  GoogleCalendarCalendarEntity,
  GoogleYouTubeSubscriptionEntity,
} from "@ait/core";

export type IntegrationEntity =
  | SpotifyTrackEntity
  | SpotifyArtistEntity
  | SpotifyPlaylistEntity
  | SpotifyAlbumEntity
  | SpotifyRecentlyPlayedEntity
  | GitHubRepositoryEntity
  | GitHubPullRequestEntity
  | GitHubCommitEntity
  | LinearIssueEntity
  | XTweetEntity
  | NotionPageEntity
  | SlackMessageEntity
  | GoogleCalendarEventEntity
  | GoogleCalendarCalendarEntity
  | GoogleYouTubeSubscriptionEntity;

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
}

export interface ContentAlgorithmResult {
  items: IntegrationEntity[];
  sections: Array<{
    sectionId: string;
    items: IntegrationEntity[];
  }>;
}
