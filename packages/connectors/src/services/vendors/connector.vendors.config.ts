import { connectorGithubRepositoryMapper } from "@/domain/mappers/vendors/connector.github.mapper";
import {
  connectorSpotifyArtistMapper,
  connectorSpotifyTrackMapper,
} from "@/domain/mappers/vendors/connector.spotify.mapper";
import { connectorXTweetMapper } from "@/domain/mappers/vendors/connector.x.mapper";
import type { ConnectorGitHub } from "@/infrastructure/vendors/github/connector.github";
import type { ConnectorSpotify } from "@/infrastructure/vendors/spotify/connector.spotify";
import type { ConnectorX } from "@/infrastructure/vendors/x/connector.x";
import type {
  GitHubRepositoryEntity,
  GitHubRepositoryExternal,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import type {
  SpotifyArtistEntity,
  SpotifyArtistExternal,
  SpotifyTrackEntity,
  SpotifyTrackExternal,
} from "@/types/domain/entities/vendors/connector.spotify.types";
import type { XTweetEntity, XTweetExternal } from "@/types/domain/entities/vendors/connector.x.repository.types";

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
}

export interface SpotifyServiceEntityMap {
  [SPOTIFY_ENTITY_TYPES_ENUM.TRACK]: SpotifyTrackEntity;
  [SPOTIFY_ENTITY_TYPES_ENUM.ARTIST]: SpotifyArtistEntity;
}

export enum X_ENTITY_TYPES_ENUM {
  TWEET = "tweet",
}

export interface XServiceEntityMap {
  [X_ENTITY_TYPES_ENUM.TWEET]: XTweetEntity;
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
} as const;

const xEntityConfigs = {
  [X_ENTITY_TYPES_ENUM.TWEET]: {
    fetcher: (connector: ConnectorX) => connector.dataSource.fetchTweets(),
    mapper: (tweet: XTweetExternal) => connectorXTweetMapper.externalToDomain(tweet),
  } satisfies EntityConfig<ConnectorX, XTweetExternal, XTweetEntity>,
} as const;

export const connectorEntityConfigs = {
  github: githubEntityConfigs,
  spotify: spotifyEntityConfigs,
  x: xEntityConfigs,
} as const;

export type ConnectorType = keyof typeof connectorEntityConfigs;
export type EntityType<C extends ConnectorType> = keyof (typeof connectorEntityConfigs)[C];
export type ConnectorConfig<C extends ConnectorType> = (typeof connectorEntityConfigs)[C];
