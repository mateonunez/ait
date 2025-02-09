import { getPostgresClient, githubRepositories, type OAuthTokenDataTarget } from "@ait/postgres";
import { connectorGithubRepositoryMapper } from "../../mappers/vendors/connector.github.mapper";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { saveOAuthData, getOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import { randomUUID } from "node:crypto";
import type {
  IConnectorGitHubRepoRepository,
  GitHubRepositoryEntity,
  IConnectorGitHubRepository,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import type { IConnectorRepositorySaveOptions } from "@/types/domain/entities/connector.repository.interface";

export class ConnectorGitHubRepoRepository implements IConnectorGitHubRepoRepository {
  private _pgClient = getPostgresClient();

  async saveRepository(
    repository: GitHubRepositoryEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const repositoryId = incremental ? randomUUID() : repository.id;

    try {
      console.debug("Before mapping repository to data target:", repository);
      const repositoryData = connectorGithubRepositoryMapper.domainToDataTarget(repository);
      console.debug("After mapping repository to data target:", repositoryData);
      repositoryData.id = repositoryId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx.insert(githubRepositories).values(repositoryData).onConflictDoNothing().execute();
      });

      console.debug("Repository saved successfully:", { repoId: repositoryId });
    } catch (error: any) {
      console.error("Failed to save repository:", { repoId: repositoryId, error });
      throw new Error(`Failed to save repository ${repositoryId}: ${error.message}`);
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

  constructor() {
    super();
    this._gitHubRepositoryRepository = new ConnectorGitHubRepoRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    saveOAuthData(data, "github");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("github");
  }

  get repo(): ConnectorGitHubRepoRepository {
    return this._gitHubRepositoryRepository;
  }

  set repo(repo: ConnectorGitHubRepoRepository) {
    this._gitHubRepositoryRepository = repo;
  }
}
