import type { GitHubRepositoryEntity } from "@/domain/entities/vendors/connector.github.repository";
import type { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import { ConnectorGitHub } from "@/infrastructure/vendors/github/connector.github";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { connectorConfigs } from "../connector.service.config";
import { connectorEntityConfigs } from "./entities/connector.entity.config";

export interface GitHubServiceEntityMap {
  repository: GitHubRepositoryEntity;
}

export class ConnectorGitHubService extends ConnectorServiceBase<ConnectorGitHub, GitHubServiceEntityMap> {
  constructor() {
    super(connectorConfigs.github!);

    this.registerEntityConfig("repository", {
      fetcher: () => connectorEntityConfigs.github.repository.fetcher(this._connector),
      mapper: connectorEntityConfigs.github.repository.mapper,
    });
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorGitHub {
    return new ConnectorGitHub(oauth);
  }

  async getRepositories(): Promise<GitHubRepositoryEntity[]> {
    return this.fetchEntities("repository");
  }
}
