import type { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import { ConnectorGitHub } from "@/infrastructure/vendors/github/connector.github";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { connectorConfigs } from "../connector.service.config";
import type {
  GitHubRepositoryEntity,
  GitHubRepositoryExternal,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import {
  connectorEntityConfigs,
  GITHUB_ENTITY_TYPES_ENUM,
  type GitHubServiceEntityMap,
} from "./connector.vendors.config";

export class ConnectorGitHubService extends ConnectorServiceBase<ConnectorGitHub, GitHubServiceEntityMap> {
  constructor() {
    super(connectorConfigs.github!);

    this.registerEntityConfig<GITHUB_ENTITY_TYPES_ENUM.REPOSITORY, GitHubRepositoryExternal>(
      GITHUB_ENTITY_TYPES_ENUM.REPOSITORY,
      connectorEntityConfigs.github[GITHUB_ENTITY_TYPES_ENUM.REPOSITORY],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorGitHub {
    return new ConnectorGitHub(oauth);
  }

  async getRepositories(): Promise<GitHubRepositoryEntity[]> {
    return this.fetchEntities(GITHUB_ENTITY_TYPES_ENUM.REPOSITORY);
  }
}
