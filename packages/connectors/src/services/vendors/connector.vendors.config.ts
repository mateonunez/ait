import type {
  GitHubCommitExternal,
  GitHubPullRequestExternal,
  GitHubRepositoryExternal,
  GmailMessageExternal,
  GoogleCalendarCalendarExternal,
  GoogleCalendarEventExternal,
  GoogleContactExternal,
  GooglePhotoExternal,
  GoogleYouTubeSubscriptionExternal,
  LinearIssueExternal,
  NotionPageExternal,
  SlackMessageExternal,
  SpotifyAlbumExternal,
  SpotifyArtistExternal,
  SpotifyPlaylistExternal,
  SpotifyRecentlyPlayedExternal,
  SpotifyTrackExternal,
  XTweetExternal,
} from "@ait/core";
import {
  type GitHubCommitEntity,
  type GitHubPullRequestEntity,
  type GitHubRepositoryEntity,
  type GmailMessageEntity,
  type GoogleCalendarCalendarEntity,
  type GoogleCalendarEventEntity,
  type GoogleContactEntity,
  type GooglePhotoEntity,
  type GoogleYouTubeSubscriptionEntity,
  type LinearIssueEntity,
  type NotionPageEntity,
  type SlackMessageEntity,
  type SpotifyAlbumEntity,
  type SpotifyArtistEntity,
  type SpotifyPlaylistEntity,
  type SpotifyRecentlyPlayedEntity,
  type SpotifyTrackEntity,
  type XTweetEntity,
  mapGitHubCommit,
  mapGitHubPullRequest,
  mapGitHubRepository,
  mapGmailMessage,
  mapGoogleCalendarCalendar,
  mapGoogleCalendarEvent,
  mapGoogleContact,
  mapGooglePhoto,
  mapGoogleYouTubeSubscription,
  mapLinearIssue,
  mapNotionPage,
  mapSlackMessage,
  mapSpotifyAlbum,
  mapSpotifyArtist,
  mapSpotifyPlaylist,
  mapSpotifyRecentlyPlayed,
  mapSpotifyTrack,
  mapXTweet,
} from "@ait/core";
import type { ConnectorGitHub } from "../../infrastructure/vendors/github/connector.github";
import type { ConnectorGoogle } from "../../infrastructure/vendors/google/connector.google";
import type { ConnectorLinear } from "../../infrastructure/vendors/linear/connector.linear";
import type { ConnectorNotion } from "../../infrastructure/vendors/notion/connector.notion";
import type { ConnectorSlack } from "../../infrastructure/vendors/slack/connector.slack";
import type { ConnectorSpotify } from "../../infrastructure/vendors/spotify/connector.spotify";
import type { ConnectorX } from "../../infrastructure/vendors/x/connector.x";

export type ConnectorCursor = { id: string; timestamp: Date };

export interface EntityConfig<TConnector, TExternal, TDomain> {
  fetcher?: (connector: TConnector) => Promise<TExternal[]>;
  paginatedFetcher?: (
    connector: TConnector,
    cursor?: ConnectorCursor,
  ) => Promise<{ data: TExternal[]; nextCursor?: ConnectorCursor }>;
  mapper: (external: TExternal) => TDomain;
  cacheTtl?: number;
  batchSize?: number;
  checksumEnabled?: boolean;
}

export enum GITHUB_ENTITY_TYPES_ENUM {
  REPOSITORY = "github_repository",
  PULL_REQUEST = "github_pull_request",
  COMMIT = "github_commit",
}

export interface GitHubServiceEntityMap {
  [GITHUB_ENTITY_TYPES_ENUM.REPOSITORY]: GitHubRepositoryEntity;
  [GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST]: GitHubPullRequestEntity;
  [GITHUB_ENTITY_TYPES_ENUM.COMMIT]: GitHubCommitEntity;
}

export enum SPOTIFY_ENTITY_TYPES_ENUM {
  TRACK = "spotify_track",
  ARTIST = "spotify_artist",
  PLAYLIST = "spotify_playlist",
  ALBUM = "spotify_album",
  RECENTLY_PLAYED = "spotify_recently_played",
}

export interface SpotifyServiceEntityMap {
  [SPOTIFY_ENTITY_TYPES_ENUM.TRACK]: SpotifyTrackEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.ARTIST]: SpotifyArtistEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST]: SpotifyPlaylistEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.ALBUM]: SpotifyAlbumEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED]: SpotifyRecentlyPlayedEntity;
}

export enum X_ENTITY_TYPES_ENUM {
  TWEET = "x_tweet",
}

export interface XServiceEntityMap {
  [X_ENTITY_TYPES_ENUM.TWEET]: XTweetEntity;
}

export enum LINEAR_ENTITY_TYPES_ENUM {
  ISSUE = "linear_issue",
}

export interface LinearServiceEntityMap {
  [LINEAR_ENTITY_TYPES_ENUM.ISSUE]: LinearIssueEntity;
}

export enum NOTION_ENTITY_TYPES_ENUM {
  PAGE = "notion_page",
}

export interface NotionServiceEntityMap {
  [NOTION_ENTITY_TYPES_ENUM.PAGE]: NotionPageEntity;
}

export enum SLACK_ENTITY_TYPES_ENUM {
  MESSAGE = "slack_message",
}

export interface SlackServiceEntityMap {
  [SLACK_ENTITY_TYPES_ENUM.MESSAGE]: SlackMessageEntity;
}

export enum GOOGLE_ENTITY_TYPES_ENUM {
  EVENT = "google_calendar_event",
  CALENDAR = "google_calendar_calendar",
  SUBSCRIPTION = "google_youtube_subscription",
  CONTACT = "google_contact",
  PHOTO = "google_photo",
  MESSAGE = "gmail_message",
}

export interface GoogleServiceEntityMap {
  [GOOGLE_ENTITY_TYPES_ENUM.EVENT]: GoogleCalendarEventEntity;
  [GOOGLE_ENTITY_TYPES_ENUM.CALENDAR]: GoogleCalendarCalendarEntity;
  [GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION]: GoogleYouTubeSubscriptionEntity;
  [GOOGLE_ENTITY_TYPES_ENUM.CONTACT]: GoogleContactEntity;
  [GOOGLE_ENTITY_TYPES_ENUM.PHOTO]: GooglePhotoEntity;
  [GOOGLE_ENTITY_TYPES_ENUM.MESSAGE]: GmailMessageEntity;
}

const githubEntityConfigs = {
  [GITHUB_ENTITY_TYPES_ENUM.REPOSITORY]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchRepositories(),
    paginatedFetcher: async (connector: ConnectorGitHub, cursor?: ConnectorCursor) => {
      // Data source expects string cursor (page number)
      const page = cursor?.id ? Number.parseInt(cursor.id) : 1;
      const limit = 50;
      const repos = await connector.dataSource.fetchRepositories({ page, limit });
      const nextCursorString = repos.length === limit ? String(page + 1) : undefined;

      return {
        data: repos,
        nextCursor: nextCursorString
          ? { id: nextCursorString, timestamp: new Date() } // Timestamp not used for repo pagination logic yet
          : undefined,
      };
    },
    mapper: (repo: GitHubRepositoryExternal) => mapGitHubRepository(repo),
    cacheTtl: 3600,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGitHub, GitHubRepositoryExternal, GitHubRepositoryEntity>,

  [GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchPullRequests(),
    paginatedFetcher: async (connector: ConnectorGitHub, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchPullRequestsPaginated(cursor?.id);
      return {
        data: response.data,
        nextCursor: response.nextCursor
          ? { id: response.nextCursor, timestamp: new Date() } // Use current time as fallback
          : undefined,
      };
    },
    mapper: (pr: GitHubPullRequestExternal) => mapGitHubPullRequest(pr),
    cacheTtl: 300,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGitHub, GitHubPullRequestExternal, GitHubPullRequestEntity>,

  [GITHUB_ENTITY_TYPES_ENUM.COMMIT]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchCommits(),
    paginatedFetcher: async (connector: ConnectorGitHub, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchCommitsPaginated(cursor?.id);
      return {
        data: response.data,
        nextCursor: response.nextCursor
          ? { id: response.nextCursor, timestamp: new Date() } // Use current time as fallback
          : undefined,
      };
    },
    mapper: (commit: GitHubCommitExternal) => mapGitHubCommit(commit),
    cacheTtl: 300,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGitHub, GitHubCommitExternal, GitHubCommitEntity>,
} as const;

const spotifyEntityConfigs = {
  [SPOTIFY_ENTITY_TYPES_ENUM.TRACK]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTracks().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchTracks(cursor?.id);
      return {
        data: response.items,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (track: SpotifyTrackExternal) => mapSpotifyTrack(track),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyTrackExternal, SpotifyTrackEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.ARTIST]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTopArtists(),
    mapper: (artist: SpotifyArtistExternal) => mapSpotifyArtist(artist),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyArtistExternal, SpotifyArtistEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchPlaylists().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchPlaylists(cursor?.id);

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
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (playlist: SpotifyPlaylistExternal) => mapSpotifyPlaylist(playlist),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyPlaylistExternal, SpotifyPlaylistEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.ALBUM]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchAlbums().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchAlbums(cursor?.id);
      return {
        data: response.items,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (album: SpotifyAlbumExternal) => mapSpotifyAlbum(album),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyAlbumExternal, SpotifyAlbumEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchRecentlyPlayed().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorSpotify, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchRecentlyPlayed(cursor?.id);
      return {
        data: response.items,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (item: SpotifyRecentlyPlayedExternal) => mapSpotifyRecentlyPlayed(item),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSpotify, SpotifyRecentlyPlayedExternal, SpotifyRecentlyPlayedEntity>,
} as const;

const xEntityConfigs = {
  [X_ENTITY_TYPES_ENUM.TWEET]: {
    fetcher: (connector: ConnectorX) => connector.dataSource.fetchTweets().then((res) => res.tweets),
    paginatedFetcher: async (connector: ConnectorX, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchTweets(cursor?.id);
      return {
        data: response.tweets,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (tweet: XTweetExternal) => mapXTweet(tweet),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorX, XTweetExternal, XTweetEntity>,
} as const;

const linearEntityConfigs = {
  [LINEAR_ENTITY_TYPES_ENUM.ISSUE]: {
    fetcher: (connector: ConnectorLinear) => connector.dataSource.fetchIssues().then((res) => res.issues), // Keep legacy fetcher for backward compatibility if needed, or remove
    paginatedFetcher: async (connector: ConnectorLinear, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchIssues(cursor?.id);
      return {
        data: response.issues,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (issue: LinearIssueExternal) => mapLinearIssue(issue),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorLinear, LinearIssueExternal, LinearIssueEntity>,
} as const;

const notionEntityConfigs = {
  [NOTION_ENTITY_TYPES_ENUM.PAGE]: {
    fetcher: (connector: ConnectorNotion) => connector.dataSource.fetchPages().then((res) => res.pages),
    paginatedFetcher: async (connector: ConnectorNotion, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchPages(cursor?.id);
      return {
        data: response.pages,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (page: NotionPageExternal) => mapNotionPage(page),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorNotion, NotionPageExternal, NotionPageEntity>,
} as const;

const slackEntityConfigs = {
  [SLACK_ENTITY_TYPES_ENUM.MESSAGE]: {
    fetcher: (connector: ConnectorSlack) => connector.dataSource.fetchMessages().then((res) => res.messages),
    paginatedFetcher: async (connector: ConnectorSlack, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchMessages(cursor?.id);
      return {
        data: response.messages,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (message: SlackMessageExternal) => mapSlackMessage(message),
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorSlack, SlackMessageExternal, SlackMessageEntity>,
} as const;

const googleEntityConfigs = {
  [GOOGLE_ENTITY_TYPES_ENUM.EVENT]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchEvents().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorGoogle, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchEvents(cursor?.id);
      return {
        data: response.items,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (event: GoogleCalendarEventExternal) => mapGoogleCalendarEvent(event),
    cacheTtl: 300,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGoogle, GoogleCalendarEventExternal, GoogleCalendarEventEntity>,

  [GOOGLE_ENTITY_TYPES_ENUM.CALENDAR]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchCalendars(),
    mapper: (calendar: GoogleCalendarCalendarExternal) => mapGoogleCalendarCalendar(calendar),
    cacheTtl: 3600,
  } satisfies EntityConfig<ConnectorGoogle, GoogleCalendarCalendarExternal, GoogleCalendarCalendarEntity>,

  [GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchSubscriptions().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorGoogle, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchSubscriptions(cursor?.id);
      return {
        data: response.items,
        nextCursor: response.nextPageToken ? { id: response.nextPageToken, timestamp: new Date() } : undefined,
      };
    },
    mapper: (subscription: GoogleYouTubeSubscriptionExternal) => mapGoogleYouTubeSubscription(subscription),
    cacheTtl: 3600,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGoogle, GoogleYouTubeSubscriptionExternal, GoogleYouTubeSubscriptionEntity>,

  [GOOGLE_ENTITY_TYPES_ENUM.CONTACT]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchContacts().then((res) => res.connections),
    paginatedFetcher: async (connector: ConnectorGoogle, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchContacts(cursor?.id);
      return {
        data: response.connections,
        nextCursor: response.nextPageToken ? { id: response.nextPageToken, timestamp: new Date() } : undefined,
      };
    },
    mapper: (contact: GoogleContactExternal) => mapGoogleContact(contact),
    cacheTtl: 3600,
    checksumEnabled: true,
    batchSize: 100,
  } satisfies EntityConfig<ConnectorGoogle, GoogleContactExternal, GoogleContactEntity>,

  [GOOGLE_ENTITY_TYPES_ENUM.PHOTO]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.fetchPhotos().then((res) => res.mediaItems),
    paginatedFetcher: async (connector: ConnectorGoogle, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.fetchPhotos(cursor?.id);
      const nextToken = response.nextPageToken;
      const currentToken = cursor?.id;

      if (nextToken && nextToken === currentToken) {
        console.warn("[GooglePhotos] Infinite loop detected: nextPageToken equals currentToken. Breaking.");
        return { data: response.mediaItems ?? [], nextCursor: undefined };
      }

      return {
        data: response.mediaItems ?? [], // Ensure array if undefined
        nextCursor: response.nextPageToken ? { id: response.nextPageToken, timestamp: new Date() } : undefined,
      };
    },
    mapper: (photo: GooglePhotoExternal) => mapGooglePhoto(photo),
    cacheTtl: 3600,
    batchSize: 100,
    checksumEnabled: true,
  } satisfies EntityConfig<ConnectorGoogle, GooglePhotoExternal, GooglePhotoEntity>,

  [GOOGLE_ENTITY_TYPES_ENUM.MESSAGE]: {
    fetcher: (connector: ConnectorGoogle) => connector.dataSource.listMessages().then((res) => res.items),
    paginatedFetcher: async (connector: ConnectorGoogle, cursor?: ConnectorCursor) => {
      const response = await connector.dataSource.listMessages(cursor?.id);
      return {
        data: response.items,
        nextCursor: response.nextCursor ? { id: response.nextCursor, timestamp: new Date() } : undefined,
      };
    },
    mapper: (message: GmailMessageExternal) => mapGmailMessage(message),
    cacheTtl: 300,
    checksumEnabled: true,
    batchSize: 50,
  } satisfies EntityConfig<ConnectorGoogle, GmailMessageExternal, GmailMessageEntity>,
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
