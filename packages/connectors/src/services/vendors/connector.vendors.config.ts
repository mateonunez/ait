import { connectorGithubMapper } from "@/domain/mappers/vendors/connector.github.mapper";
import {
  connectorSpotifyArtistMapper,
  connectorSpotifyTrackMapper,
} from "@/domain/mappers/vendors/connector.spotify.mapper";
import type { ConnectorGitHub } from "@/infrastructure/vendors/github/connector.github";
import type { ConnectorSpotify } from "@/infrastructure/vendors/spotify/connector.spotify";
import type {
  GitHubRepositoryEntity,
  GitHubRepositoryExternal,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import type {
  SpotifyArtistEntity,
  SpotifyArtistExternal,
  SpotifyTrackEntity,
  SpotifyTrackExternal,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";

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

const githubEntityConfigs = {
  [GITHUB_ENTITY_TYPES_ENUM.REPOSITORY]: {
    fetcher: (connector: ConnectorGitHub) => connector.dataSource.fetchRepositories(),
    mapper: (repo: GitHubRepositoryExternal) => connectorGithubMapper.externalToDomain(repo),
  } satisfies EntityConfig<ConnectorGitHub, GitHubRepositoryExternal, GitHubRepositoryEntity>,
} as const;

const spotifyEntityConfigs = {
  [SPOTIFY_ENTITY_TYPES_ENUM.TRACK]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTopTracks(),
    mapper: (track: SpotifyTrackExternal) => connectorSpotifyTrackMapper.externalToDomain(track),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyTrackExternal, SpotifyTrackEntity>,

  [SPOTIFY_ENTITY_TYPES_ENUM.ARTIST]: {
    fetcher: (connector: ConnectorSpotify) => connector.dataSource.fetchTopArtists(),
    mapper: (artist: SpotifyArtistExternal) => connectorSpotifyArtistMapper.externalToDomain(artist),
  } satisfies EntityConfig<ConnectorSpotify, SpotifyArtistExternal, SpotifyArtistEntity>,
} as const;

export const connectorEntityConfigs = {
  github: githubEntityConfigs,
  spotify: spotifyEntityConfigs,
} as const;

export type ConnectorType = keyof typeof connectorEntityConfigs;
export type EntityType<C extends ConnectorType> = keyof (typeof connectorEntityConfigs)[C];
export type ConnectorConfig<C extends ConnectorType> = (typeof connectorEntityConfigs)[C];
