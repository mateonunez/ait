import { connectorGithubMapper } from "@/domain/mappers/vendors/connector.github.mapper";
import { connectorSpotifyTrackMapper } from "@/domain/mappers/vendors/connector.spotify.mapper";
import type { ConnectorGitHub } from "@/infrastructure/vendors/github/connector.github";
import type { ConnectorSpotify } from "@/infrastructure/vendors/spotify/connector.spotify";
import type {
  GitHubRepository,
  GitHubRepositoryEntity,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import type {
  SpotifyTrack,
  SpotifyTrackEntity,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";

export interface ConnectorEntityMap {
  github: {
    repository: GitHubRepositoryEntity;
  };
  spotify: {
    track: SpotifyTrackEntity;
  };
}

export const connectorEntityConfigs = {
  github: {
    repository: {
      fetcher: (connector: ConnectorGitHub) => connector.dataSource?.fetchRepositories() || Promise.resolve([]),
      mapper: (entity: GitHubRepository) => connectorGithubMapper.externalToDomain(entity),
    },
  },
  spotify: {
    track: {
      fetcher: (connector: ConnectorSpotify) => connector.dataSource?.fetchTopTracks() || Promise.resolve([]),
      mapper: (entity: SpotifyTrack) => connectorSpotifyTrackMapper.externalToDomain(entity),
    },
  },
} as const;

export type ConnectorType = keyof typeof connectorEntityConfigs;
export type EntityType<T extends ConnectorType> = keyof ConnectorEntityMap[T];
