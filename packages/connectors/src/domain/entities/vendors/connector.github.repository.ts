import { AItError } from "@ait/core";
import { getPostgresClient, githubRepositories, type OAuthTokenDataTarget } from "@ait/postgres";
import { connectorGithubRepositoryMapper } from "../../mappers/vendors/connector.github.mapper";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import { saveOAuthData, getOAuthData, clearOAuthData } from "../../../shared/auth/lib/oauth/connector.oauth.utils";
import { randomUUID } from "node:crypto";
import type {
  IConnectorGitHubRepoRepository,
  GitHubRepositoryEntity,
  IConnectorGitHubRepository,
} from "../../../types/domain/entities/vendors/connector.github.repository.types";
import type { IConnectorRepositorySaveOptions } from "../../../types/domain/entities/connector.repository.interface";
import { ConnectorGitHubPullRequestRepository } from "./connector.github.pull-request.repository";

export class ConnectorGitHubRepoRepository implements IConnectorGitHubRepoRepository {
  private _pgClient = getPostgresClient();

  async saveRepository(
    repository: GitHubRepositoryEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const repositoryId = incremental ? randomUUID() : repository.id;

    try {
      const repositoryData = connectorGithubRepositoryMapper.domainToDataTarget(repository);
      repositoryData.id = repositoryId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx
          .insert(githubRepositories)
          .values(repositoryData)
          .onConflictDoUpdate({
            target: githubRepositories.id,
            set: {
              name: repositoryData.name,
              description: repositoryData.description,
              stars: repositoryData.stars,
              forks: repositoryData.forks,
              url: repositoryData.url,
              language: repositoryData.language,
              fullName: repositoryData.fullName,
              private: repositoryData.private,
              fork: repositoryData.fork,
              archived: repositoryData.archived,
              disabled: repositoryData.disabled,
              visibility: repositoryData.visibility,
              watchersCount: repositoryData.watchersCount,
              openIssuesCount: repositoryData.openIssuesCount,
              size: repositoryData.size,
              defaultBranch: repositoryData.defaultBranch,
              topics: repositoryData.topics,
              isTemplate: repositoryData.isTemplate,
              hasIssues: repositoryData.hasIssues,
              hasProjects: repositoryData.hasProjects,
              hasWiki: repositoryData.hasWiki,
              hasPages: repositoryData.hasPages,
              hasDiscussions: repositoryData.hasDiscussions,
              homepage: repositoryData.homepage,
              pushedAt: repositoryData.pushedAt,
              licenseName: repositoryData.licenseName,
              cloneUrl: repositoryData.cloneUrl,
              sshUrl: repositoryData.sshUrl,
              ownerData: repositoryData.ownerData,
              licenseData: repositoryData.licenseData,
              metadata: repositoryData.metadata,
              updatedAt: new Date(),
            },
          })
          .execute();
      });
    } catch (error: any) {
      console.error("Failed to save repository:", { repoId: repositoryId, error });
      throw new AItError(
        "GITHUB_SAVE_REPOSITORY",
        `Failed to save repository ${repositoryId}: ${error.message}`,
        { id: repositoryId },
        error,
      );
    }
  }

  async saveRepositories(repos: GitHubRepositoryEntity[]): Promise<void> {
    if (!repos.length) {
      return;
    }

    await Promise.all(repos.map((repo) => this.saveRepository(repo)));
  }

  async getRepository(id: string): Promise<GitHubRepositoryEntity | null> {
    console.log("Getting repository from GitHub repository", id);
    return null;
  }

  async getRepositories(): Promise<GitHubRepositoryEntity[]> {
    console.log("Getting repositories from GitHub repository");
    return [];
  }
}

/**
 * Connector for GitHub repositories:
 */
export class ConnectorGitHubRepository extends ConnectorGitHubRepoRepository implements IConnectorGitHubRepository {
  private _gitHubRepositoryRepository: ConnectorGitHubRepoRepository;
  private _gitHubPullRequestRepository: ConnectorGitHubPullRequestRepository;

  constructor() {
    super();
    this._gitHubRepositoryRepository = new ConnectorGitHubRepoRepository();
    this._gitHubPullRequestRepository = new ConnectorGitHubPullRequestRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "github");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("github");
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("github");
  }

  get repo(): ConnectorGitHubRepoRepository {
    return this._gitHubRepositoryRepository;
  }

  set repo(repo: ConnectorGitHubRepoRepository) {
    this._gitHubRepositoryRepository = repo;
  }

  get pullRequest(): ConnectorGitHubPullRequestRepository {
    return this._gitHubPullRequestRepository;
  }

  set pullRequest(pullRequest: ConnectorGitHubPullRequestRepository) {
    this._gitHubPullRequestRepository = pullRequest;
  }
}
