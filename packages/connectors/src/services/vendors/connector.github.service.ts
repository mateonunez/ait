import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorGitHub } from "../../infrastructure/vendors/github/connector.github";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { getConnectorConfig } from "../connector.service.config";
import type {
  GitHubRepositoryEntity,
  GitHubRepositoryExternal,
  GitHubPullRequestEntity,
  GitHubPullRequestExternal,
  PaginatedResponse,
  PaginationParams,
} from "@ait/core";
import {
  connectorEntityConfigs,
  GITHUB_ENTITY_TYPES_ENUM,
  type GitHubServiceEntityMap,
} from "./connector.vendors.config";

export interface IConnectorGitHubService extends ConnectorServiceBase<ConnectorGitHub, GitHubServiceEntityMap> {
  fetchRepositories(): Promise<GitHubRepositoryEntity[]>;
  fetchPullRequests(): Promise<GitHubPullRequestEntity[]>;
  getRepositoriesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubRepositoryEntity>>;
  getPullRequestsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubPullRequestEntity>>;
}

export class ConnectorGitHubService
  extends ConnectorServiceBase<ConnectorGitHub, GitHubServiceEntityMap>
  implements IConnectorGitHubService
{
  constructor() {
    super(getConnectorConfig("github"));

    this.registerEntityConfig<GITHUB_ENTITY_TYPES_ENUM.REPOSITORY, GitHubRepositoryExternal>(
      GITHUB_ENTITY_TYPES_ENUM.REPOSITORY,
      connectorEntityConfigs.github[GITHUB_ENTITY_TYPES_ENUM.REPOSITORY],
    );

    this.registerEntityConfig<GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST, GitHubPullRequestExternal>(
      GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST,
      connectorEntityConfigs.github[GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST],
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorGitHub {
    return new ConnectorGitHub(oauth);
  }

  async fetchRepositories(): Promise<GitHubRepositoryEntity[]> {
    return this.fetchEntities(GITHUB_ENTITY_TYPES_ENUM.REPOSITORY, true);
  }

  async fetchPullRequests(): Promise<GitHubPullRequestEntity[]> {
    return this.fetchEntities(GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST, true);
  }

  async getRepositoriesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubRepositoryEntity>> {
    return this.connector.repository.repo.getRepositoriesPaginated(params);
  }

  async getPullRequestsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubPullRequestEntity>> {
    return this.connector.repository.pullRequest.getPullRequestsPaginated(params);
  }
}
