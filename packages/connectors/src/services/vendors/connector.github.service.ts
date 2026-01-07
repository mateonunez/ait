import type {
  GitHubCommitEntity,
  GitHubCommitExternal,
  GitHubFileEntity,
  GitHubPullRequestEntity,
  GitHubPullRequestExternal,
  GitHubRepositoryEntity,
  GitHubRepositoryExternal,
  PaginatedResponse,
  PaginationParams,
} from "@ait/core";
import { ConnectorGitHub } from "../../infrastructure/vendors/github/connector.github";
import type { ConnectorOAuth, IConnectorOAuthConfig } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { getConnectorConfig } from "../connector.service.config";
import {
  GITHUB_ENTITY_TYPES_ENUM,
  type GitHubServiceEntityMap,
  connectorEntityConfigs,
} from "./connector.vendors.config";

export interface IConnectorGitHubService extends ConnectorServiceBase<ConnectorGitHub, GitHubServiceEntityMap> {
  fetchRepositories(): Promise<GitHubRepositoryEntity[]>;
  fetchPullRequests(): Promise<GitHubPullRequestEntity[]>;
  fetchCommits(): Promise<GitHubCommitEntity[]>;
  getRepositoriesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubRepositoryEntity>>;
  getPullRequestsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubPullRequestEntity>>;
  getCommitsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubCommitEntity>>;
  getFilesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubFileEntity>>;
}

export class ConnectorGitHubService
  extends ConnectorServiceBase<ConnectorGitHub, GitHubServiceEntityMap>
  implements IConnectorGitHubService
{
  constructor(config?: IConnectorOAuthConfig) {
    super(config ?? getConnectorConfig("github"));

    const repoConfig = connectorEntityConfigs.github[GITHUB_ENTITY_TYPES_ENUM.REPOSITORY];
    if (!repoConfig.paginatedFetcher) {
      throw new Error("GitHub repository config missing paginatedFetcher");
    }

    this.registerPaginatedEntityConfig<GITHUB_ENTITY_TYPES_ENUM.REPOSITORY, GitHubRepositoryExternal>(
      GITHUB_ENTITY_TYPES_ENUM.REPOSITORY,
      {
        paginatedFetcher: repoConfig.paginatedFetcher,
        mapper: repoConfig.mapper,
        cacheTtl: repoConfig.cacheTtl,
        batchSize: repoConfig.batchSize,
        checksumEnabled: repoConfig.checksumEnabled,
      },
    );

    this.registerPaginatedEntityConfig<GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST, GitHubPullRequestExternal>(
      GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST,
      connectorEntityConfigs.github[GITHUB_ENTITY_TYPES_ENUM.PULL_REQUEST],
    );

    this.registerPaginatedEntityConfig<GITHUB_ENTITY_TYPES_ENUM.COMMIT, GitHubCommitExternal>(
      GITHUB_ENTITY_TYPES_ENUM.COMMIT,
      connectorEntityConfigs.github[GITHUB_ENTITY_TYPES_ENUM.COMMIT],
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

  async fetchCommits(): Promise<GitHubCommitEntity[]> {
    return this.fetchEntities(GITHUB_ENTITY_TYPES_ENUM.COMMIT, true);
  }

  async getRepositoriesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubRepositoryEntity>> {
    return this.connector.repository.repo.getRepositoriesPaginated(params);
  }

  async getPullRequestsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubPullRequestEntity>> {
    return this.connector.repository.pullRequest.getPullRequestsPaginated(params);
  }

  async getCommitsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubCommitEntity>> {
    return this.connector.repository.commit.getCommitsPaginated(params);
  }

  async getFilesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubFileEntity>> {
    return this.connector.repository.file.getFilesPaginated(params);
  }
}
