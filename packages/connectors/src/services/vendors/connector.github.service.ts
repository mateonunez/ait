import type { GitHubRepositoryEntity } from "@/domain/entities/vendors/connector.github.repository";
import type { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import { connectorGithubMapper } from "@/domain/mappers/vendors/connector.github.mapper";
import { ConnectorGitHub } from "@/infrastructure/vendors/github/connector.github";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { connectorConfigs } from "../connector.service.config";

export class ConnectorGitHubService extends ConnectorServiceBase<ConnectorGitHub, GitHubRepositoryEntity> {
  constructor() {
    super(connectorConfigs.github!);
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorGitHub {
    return new ConnectorGitHub(oauth);
  }

  async getRepositories(): Promise<GitHubRepositoryEntity[]> {
    return this.fetchEntities(
      () => this._connector.dataSource?.fetchRepositories() || Promise.resolve([]),
      (repository) => connectorGithubMapper.externalToDomain(repository),
    );
  }
}
