import type {
  GitHubCommitEntity,
  GitHubCommitExternal,
  GitHubPullRequestEntity,
  GitHubPullRequestExternal,
  GitHubRepositoryEntity,
  GitHubRepositoryExternal,
  GoogleCalendarCalendarEntity,
  GoogleCalendarCalendarExternal,
  GoogleCalendarEventEntity,
  GoogleCalendarEventExternal,
  GoogleYouTubeSubscriptionEntity,
  GoogleYouTubeSubscriptionExternal,
  LinearIssueEntity,
  LinearIssueExternal,
  NotionPageEntity,
  NotionPageExternal,
  SlackMessageEntity,
  SlackMessageExternal,
  SpotifyAlbumEntity,
  SpotifyAlbumExternal,
  SpotifyArtistEntity,
  SpotifyArtistExternal,
  SpotifyPlaylistEntity,
  SpotifyPlaylistExternal,
  SpotifyRecentlyPlayedEntity,
  SpotifyRecentlyPlayedExternal,
  SpotifyTrackEntity,
  SpotifyTrackExternal,
  XTweetEntity,
  XTweetExternal,
} from "@ait/core";
import { connectorGithubCommitMapper } from "../../domain/mappers/vendors/connector.github.commit.mapper";
import { connectorGithubRepositoryMapper } from "../../domain/mappers/vendors/connector.github.mapper";
import { connectorGithubPullRequestMapper } from "../../domain/mappers/vendors/connector.github.pull-request.mapper";
import { connectorGoogleYouTubeSubscriptionMapper } from "../../domain/mappers/vendors/connector.google-youtube.mapper";
import {
  connectorGoogleCalendarCalendarMapper,
  connectorGoogleCalendarEventMapper,
} from "../../domain/mappers/vendors/connector.google.mapper";
import { connectorLinearIssueMapper } from "../../domain/mappers/vendors/connector.linear.mapper";
import { connectorNotionPageMapper } from "../../domain/mappers/vendors/connector.notion.mapper";
import { connectorSlackMessageMapper } from "../../domain/mappers/vendors/connector.slack.mapper";
import {
  connectorSpotifyAlbumMapper,
  connectorSpotifyArtistMapper,
  connectorSpotifyRecentlyPlayedMapper,
  connectorSpotifyTrackMapper,
} from "../../domain/mappers/vendors/connector.spotify.mapper";
import { connectorSpotifyPlaylistMapper } from "../../domain/mappers/vendors/connector.spotify.mapper";
import { connectorXTweetMapper } from "../../domain/mappers/vendors/connector.x.mapper";
import type { ConnectorGitHub } from "../../infrastructure/vendors/github/connector.github";
import type { ConnectorGoogle } from "../../infrastructure/vendors/google/connector.google";
import type { ConnectorLinear } from "../../infrastructure/vendors/linear/connector.linear";
import type { ConnectorNotion } from "../../infrastructure/vendors/notion/connector.notion";
import type { ConnectorSlack } from "../../infrastructure/vendors/slack/connector.slack";
import type { ConnectorSpotify } from "../../infrastructure/vendors/spotify/connector.spotify";
import type { ConnectorX } from "../../infrastructure/vendors/x/connector.x";

export interface EntityConfig<TConnector, TExternal, TDomain> {
  fetcher?: (connector: TConnector) => Promise<TExternal[]>;
  paginatedFetcher?: (connector: TConnector, cursor?: string) => Promise<{ data: TExternal[]; nextCursor?: string }>;
  mapper: (external: TExternal) => TDomain;
  cacheTtl?: number;
  batchSize?: number;
  checksumEnabled?: boolean;
}

export enum GITHUB_ENTITY_TYPES_ENUM {
  REPOSITORY = "repository",
  PULL_REQUEST = "pull_request",
  COMMIT = "commit",
}

export interface GitHubServiceEntityMap {
  [GITHUB_ENTITY_TYPES_ENUM.REPOSITORY]: GitHubRepositoryEntity;
  [GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST]: GitHubPullRequestEntity;
  [GITHUB_ENTITY_TYPES_ENUM.COMMIT]: GitHubCommitEntity;
}

export enum SPOTIFY_ENTITY_TYPES_ENUM {
  TRACK = "track",
  ARTIST = "artist",
  PLAYLIST = "playlist",
  ALBUM = "album",
  RECENTLY_PLAYED = "recently_played",
}

export interface SpotifyServiceEntityMap {
  [SPOTIFY_ENTITY_TYPES_ENUM.TRACK]: SpotifyTrackEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.ARTIST]: SpotifyArtistEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST]: SpotifyPlaylistEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.ALBUM]: SpotifyAlbumEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED]: SpotifyRecentlyPlayedEntity;
}

export enum X_ENTITY_TYPES_ENUM {
  TWEET = "tweet",
}

export interface XServiceEntityMap {
  [X_ENTITY_TYPES_ENUM.TWEET]: XTweetEntity;
}

export enum LINEAR_ENTITY_TYPES_ENUM {
  ISSUE = "issue",
}

export interface LinearServiceEntityMap {
  [LINEAR_ENTITY_TYPES_ENUM.ISSUE]: LinearIssueEntity;
}

export enum NOTION_ENTITY_TYPES_ENUM {
  PAGE = "page",
}

export interface NotionServiceEntityMap {
  [NOTION_ENTITY_TYPES_ENUM.PAGE]: NotionPageEntity;
}

export enum SLACK_ENTITY_TYPES_ENUM {
  MESSAGE = "message",
}

export interface SlackServiceEntityMap {
  [SLACK_ENTITY_TYPES_ENUM.MESSAGE]: SlackMessageEntity;
}

export enum GOOGLE_ENTITY_TYPES_ENUM {
  EVENT = "event",
  CALENDAR = "calendar",
  SUBSCRIPTION = "subscription",
}

export interface GoogleServiceEntityMap {
  [GOOGLE_ENTITY_TYPES_ENUM.EVENT]: GoogleCalendarEventEntity;
  [GOOGLE_ENTITY_TYPES_ENUM.CALENDAR]: GoogleCalendarCalendarEntity;
  [GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION]: GoogleYouTubeSubscriptionEntity;
}

const githubEntityConfigs = {
  [GITHUB_ENTITY_TYPES_ENUM.REPOSITORY]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchRepositories(),
    paginatedFetcher: async (connector: ConnectorGitHub, cursor?: string) => {
      const page = cursor ? Number.parseInt(cursor) : 1;
      const limit = 50;
      const repos = await connector.dataSource.fetchRepositories({ page, limit });
      return {
        data: repos,
        nextCursor: repos.length === limit ? String(page + 1) : undefined,
      };
    },
    mapper: (repo: GitHubRepositoryExternal) => connectorGithubRepositoryMapper.externalToDomain(repo),
    cacheTtl: 3600,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGitHub, GitHubRepositoryExternal, GitHubRepositoryEntity>,

  [GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchPullRequests(),
    paginatedFetcher: async (connector: ConnectorGitHub, cursor?: string) => {
      return connector.dataSource.fetchPullRequestsPaginated(cursor);
    },
    mapper: (pr: GitHubPullRequestExternal) => connectorGithubPullRequestMapper.externalToDomain(pr),
    cacheTtl: 300,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGitHub, GitHubPullRequestExternal, GitHubPullRequestEntity>,

  [GITHUB_ENTITY_TYPES_ENUM.COMMIT]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchCommits(),
    paginatedFetcher: async (connector: ConnectorGitHub, cursor?: string) => {
      return connector.dataSource.fetchCommitsPaginated(cursor);
    },
    mapper: (commit: GitHubCommitExternal) => connectorGithubCommitMapper.externalToDomain(commit),
    cacheTtl: 300,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGitHub, GitHubCommitExternal, GitHubCommitEntity>,
} as const;

const spotifyEntityConfigs = {
  [SPOTIFY_ENTITY_TYPES_ENUM.TRACK]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTracks().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: string) => {
      const response = await connector.dataSource.fetchTracks(cursor);
      return {
        data: response.items,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (track: SpotifyTrackExternal) => connectorSpotifyTrackMapper.externalToDomain(track),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyTrackExternal, SpotifyTrackEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.ARTIST]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTopArtists(),
    mapper: (artist: SpotifyArtistExternal) => connectorSpotifyArtistMapper.externalToDomain(artist),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyArtistExternal, SpotifyArtistEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchPlaylists().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: string) => {
      const response = await connector.dataSource.fetchPlaylists(cursor);

      // Process playlists in small chunks with delays to avoid rate limits
      const CHUNK_SIZE = 3;
      const DELAY_BETWEEN_CHUNKS_MS = 500;
      const playlistsWithTracks: SpotifyPlaylistExternal[] = [];

      for (let i = 0; i < response.items.length; i += CHUNK_SIZE) {
        const chunk = response.items.slice(i, i + CHUNK_SIZE);

        const chunkResults = await Promise.all(
          chunk.map(async (playlist) => {
            try {
              if (!playlist.id) {
                return playlist;
              }
              const tracks = await connector.dataSource.fetchAllPlaylistTracks(playlist.id);
              return {
                ...playlist,
                tracks: {
                  href: playlist.tracks?.href ?? "",
                  limit: playlist.tracks?.limit ?? 0,
                  next: playlist.tracks?.next ?? null,
                  offset: playlist.tracks?.offset ?? 0,
                  previous: playlist.tracks?.previous ?? null,
                  total: playlist.tracks?.total ?? 0,
                  items: tracks,
                },
              } as SpotifyPlaylistExternal;
            } catch {
              // If fetching tracks fails, return playlist without tracks
              return playlist;
            }
          }),
        );

        playlistsWithTracks.push(...chunkResults);

        if (i + CHUNK_SIZE < response.items.length) {
          await new Promise((r) => setTimeout(r, DELAY_BETWEEN_CHUNKS_MS));
        }
      }

      return {
        data: playlistsWithTracks,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (playlist: SpotifyPlaylistExternal) => connectorSpotifyPlaylistMapper.externalToDomain(playlist),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyPlaylistExternal, SpotifyPlaylistEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.ALBUM]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchAlbums().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: string) => {
      const response = await connector.dataSource.fetchAlbums(cursor);
      return {
        data: response.items,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (album: SpotifyAlbumExternal) => connectorSpotifyAlbumMapper.externalToDomain(album),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyAlbumExternal, SpotifyAlbumEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchRecentlyPlayed().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: string) => {
      const response = await connector.dataSource.fetchRecentlyPlayed(cursor);
      return {
        data: response.items,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (item: SpotifyRecentlyPlayedExternal) => connectorSpotifyRecentlyPlayedMapper.externalToDomain(item),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyRecentlyPlayedExternal, SpotifyRecentlyPlayedEntity>,
} as const;

const xEntityConfigs = {
  [X_ENTITY_TYPES_ENUM.TWEET]: {
    fetcher: (connector: ConnectorX) => connector.dataSource.fetchTweets().then((res) => res.tweets),
    paginatedFetcher: async (connector: ConnectorX, cursor?: string) => {
      const response = await connector.dataSource.fetchTweets(cursor);
      return {
        data: response.tweets,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (tweet: XTweetExternal) => connectorXTweetMapper.externalToDomain(tweet),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorX, XTweetExternal, XTweetEntity>,
} as const;

const linearEntityConfigs = {
  [LINEAR_ENTITY_TYPES_ENUM.ISSUE]: {
    fetcher: (connector: ConnectorLinear) => connector.dataSource.fetchIssues().then((res) => res.issues), // Keep legacy fetcher for backward compatibility if needed, or remove
    paginatedFetcher: async (connector: ConnectorLinear, cursor?: string) => {
      const response = await connector.dataSource.fetchIssues(cursor);
      return {
        data: response.issues,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (issue: LinearIssueExternal) => connectorLinearIssueMapper.externalToDomain(issue),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorLinear, LinearIssueExternal, LinearIssueEntity>,
} as const;

const notionEntityConfigs = {
  [NOTION_ENTITY_TYPES_ENUM.PAGE]: {
    fetcher: (connector: ConnectorNotion) => connector.dataSource.fetchPages().then((res) => res.pages),
    paginatedFetcher: async (connector: ConnectorNotion, cursor?: string) => {
      const response = await connector.dataSource.fetchPages(cursor);
      return {
        data: response.pages,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (page: NotionPageExternal) => connectorNotionPageMapper.externalToDomain(page),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorNotion, NotionPageExternal, NotionPageEntity>,
} as const;

const slackEntityConfigs = {
  [SLACK_ENTITY_TYPES_ENUM.MESSAGE]: {
    fetcher: (connector: ConnectorSlack) => connector.dataSource.fetchMessages().then((res) => res.messages),
    paginatedFetcher: async (connector: ConnectorSlack, cursor?: string) => {
      const response = await connector.dataSource.fetchMessages(cursor);
      return {
        data: response.messages,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (message: SlackMessageExternal) => connectorSlackMessageMapper.externalToDomain(message),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSlack, SlackMessageExternal, SlackMessageEntity>,
} as const;

const googleEntityConfigs = {
  [GOOGLE_ENTITY_TYPES_ENUM.EVENT]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchEvents().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorGoogle, cursor?: string) => {
      const response = await connector.dataSource.fetchEvents(cursor);
      return {
        data: response.items,
        nextCursor: response.nextCursor,
      };
    },
    mapper: (event: GoogleCalendarEventExternal) => connectorGoogleCalendarEventMapper.externalToDomain(event),
    cacheTtl: 300,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGoogle, GoogleCalendarEventExternal, GoogleCalendarEventEntity>,

  [GOOGLE_ENTITY_TYPES_ENUM.CALENDAR]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchCalendars(),
    mapper: (calendar: GoogleCalendarCalendarExternal) =>
      connectorGoogleCalendarCalendarMapper.externalToDomain(calendar),
    cacheTtl: 3600,
  } satisfies EntityConfig<ConnectorGoogle, GoogleCalendarCalendarExternal, GoogleCalendarCalendarEntity>,

  [GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchSubscriptions().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorGoogle, cursor?: string) => {
      const response = await connector.dataSource.fetchSubscriptions(cursor);
      return {
        data: response.items,
        nextCursor: response.nextPageToken,
      };
    },
    mapper: (subscription: GoogleYouTubeSubscriptionExternal) =>
      connectorGoogleYouTubeSubscriptionMapper.externalToDomain(subscription),
    cacheTtl: 3600,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGoogle, GoogleYouTubeSubscriptionExternal, GoogleYouTubeSubscriptionEntity>,
} as const;

export const connectorEntityConfigs = {
  github: githubEntityConfigs,
  linear: linearEntityConfigs,
  spotify: spotifyEntityConfigs,
  x: xEntityConfigs,
  notion: notionEntityConfigs,
  slack: slackEntityConfigs,
  google: googleEntityConfigs,
} as const;

export type ConnectorType = keyof typeof connectorEntityConfigs;
export type EntityType<C extends ConnectorType> = keyof (typeof connectorEntityConfigs)[C];
export type ConnectorConfig<C extends ConnectorType> = (typeof connectorEntityConfigs)[C];
