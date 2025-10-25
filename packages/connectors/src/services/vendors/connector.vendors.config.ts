import { connectorGithubRepositoryMapper } from "../../domain/mappers/vendors/connector.github.mapper";
import { connectorLinearIssueMapper } from "../../domain/mappers/vendors/connector.linear.mapper";
import {
  connectorSpotifyAlbumMapper,
  connectorSpotifyArtistMapper,
  connectorSpotifyRecentlyPlayedMapper,
  connectorSpotifyTrackMapper,
} from "../../domain/mappers/vendors/connector.spotify.mapper";
import { connectorXTweetMapper } from "../../domain/mappers/vendors/connector.x.mapper";
import type { ConnectorGitHub } from "../../infrastructure/vendors/github/connector.github";
import type { ConnectorLinear } from "../../infrastructure/vendors/linear/connector.linear";
import type { ConnectorSpotify } from "../../infrastructure/vendors/spotify/connector.spotify";
import type { ConnectorX } from "../../infrastructure/vendors/x/connector.x";
import type {
  GitHubRepositoryEntity,
  GitHubRepositoryExternal,
} from "../../types/domain/entities/vendors/connector.github.repository.types";
import type {
  LinearIssueEntity,
  LinearIssueExternal,
} from "../../types/domain/entities/vendors/connector.linear.types";
import type {
  SpotifyArtistEntity,
  SpotifyArtistExternal,
  SpotifyTrackEntity,
  SpotifyTrackExternal,
  SpotifyPlaylistEntity,
  SpotifyPlaylistExternal,
  SpotifyAlbumEntity,
  SpotifyAlbumExternal,
  SpotifyRecentlyPlayedEntity,
  SpotifyRecentlyPlayedExternal,
} from "../../types/domain/entities/vendors/connector.spotify.types";
import type { XTweetEntity, XTweetExternal } from "../../types/domain/entities/vendors/connector.x.repository.types";
import { connectorSpotifyPlaylistMapper } from "../../domain/mappers/vendors/connector.spotify.mapper";

export interface EntityConfig<TConnector, TExternal, TDomain> {
  fetcher: (connector: TConnector) => Promise<TExternal[]>;
  mapper: (external: TExternal) => TDomain;
}

export enum GITHUB_ENTITY_TYPES_ENUM {
  REPOSITORY = "repository",
}

export interface GitHubServiceEntityMap {
  [GITHUB_ENTITY_TYPES_ENUM.REPOSITORY]: GitHubRepositoryEntity;
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

const githubEntityConfigs = {
  [GITHUB_ENTITY_TYPES_ENUM.REPOSITORY]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchRepositories(),
    mapper: (repo: GitHubRepositoryExternal) => connectorGithubRepositoryMapper.externalToDomain(repo),
  } satisfies EntityConfig<ConnectorGitHub, GitHubRepositoryExternal, GitHubRepositoryEntity>,
} as const;

const spotifyEntityConfigs = {
  [SPOTIFY_ENTITY_TYPES_ENUM.TRACK]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTracks(),
    mapper: (track: SpotifyTrackExternal) => connectorSpotifyTrackMapper.externalToDomain(track),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyTrackExternal, SpotifyTrackEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.ARTIST]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTopArtists(),
    mapper: (artist: SpotifyArtistExternal) => connectorSpotifyArtistMapper.externalToDomain(artist),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyArtistExternal, SpotifyArtistEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.PLAYLIST]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchPlaylists(),
    mapper: (playlist: SpotifyPlaylistExternal) => connectorSpotifyPlaylistMapper.externalToDomain(playlist),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyPlaylistExternal, SpotifyPlaylistEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.ALBUM]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchAlbums(),
    mapper: (album: SpotifyAlbumExternal) => connectorSpotifyAlbumMapper.externalToDomain(album),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyAlbumExternal, SpotifyAlbumEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.RECENTLY_PLAYED]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchRecentlyPlayed(),
    mapper: (item: SpotifyRecentlyPlayedExternal) => connectorSpotifyRecentlyPlayedMapper.externalToDomain(item),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyRecentlyPlayedExternal, SpotifyRecentlyPlayedEntity>,
} as const;

const xEntityConfigs = {
  [X_ENTITY_TYPES_ENUM.TWEET]: {
    fetcher: (connector: ConnectorX) => connector.dataSource.fetchTweets(),
    mapper: (tweet: XTweetExternal) => connectorXTweetMapper.externalToDomain(tweet),
  } satisfies EntityConfig<ConnectorX, XTweetExternal, XTweetEntity>,
} as const;

const linearEntityConfigs = {
  [LINEAR_ENTITY_TYPES_ENUM.ISSUE]: {
    fetcher: (connector: ConnectorLinear) => connector.dataSource.fetchIssues(),
    mapper: (issue: LinearIssueExternal) => connectorLinearIssueMapper.externalToDomain(issue),
  } satisfies EntityConfig<ConnectorLinear, LinearIssueExternal, LinearIssueEntity>,
} as const;

export const connectorEntityConfigs = {
  github: githubEntityConfigs,
  linear: linearEntityConfigs,
  spotify: spotifyEntityConfigs,
  x: xEntityConfigs,
} as const;

export type ConnectorType = keyof typeof connectorEntityConfigs;
export type EntityType<C extends ConnectorType> = keyof (typeof connectorEntityConfigs)[C];
export type ConnectorConfig<C extends ConnectorType> = (typeof connectorEntityConfigs)[C];
