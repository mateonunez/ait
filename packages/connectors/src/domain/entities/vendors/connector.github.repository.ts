import { getPostgresClient, githubRepositories, type OAuthTokenDataTarget } from "@ait/postgres";
import { connectorGithubMapper } from "../../mappers/vendors/connector.github.mapper";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { saveOAuthData, getOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import { randomUUID } from "node:crypto";
import type {
  IConnectorGitHubRepositoryRepository,
  GitHubRepositoryEntity,
  IConnectorGitHubRepositoryRepositoryOptions,
  IConnectorGitHubRepository,
} from "@/types/domain/entities/vendors/connector.github.repository.types";

// I'm so sorry for the name of this class
export class ConnectorGitHubRepositoryRepository implements IConnectorGitHubRepositoryRepository {
  private _pgClient = getPostgresClient();

  async saveRepository(
    repository: GitHubRepositoryEntity,
    options: IConnectorGitHubRepositoryRepositoryOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const repositoryId = incremental ? randomUUID() : repository.id;

    try {
      console.debug("Before mapping repository to data target:", repository);
      const repositoryData = connectorGithubMapper.domainToDataTarget(repository);
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

    try {
      console.log("Saving repositories to GitHub repository:", repos);
      const repositoriesData = repos.map((repo) => connectorGithubMapper.domainToDataTarget(repo));

      await this._pgClient.db.transaction(async (tx) => {
        await tx.insert(githubRepositories).values(repositoriesData).onConflictDoNothing().execute();
      });

      console.debug("Repositories saved successfully:", { repos });
    } catch (error) {
      console.error("Error saving repositories:", error);
      throw new Error("Failed to save repositories to repository");
    }
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
export class ConnectorGitHubRepository
  extends ConnectorGitHubRepositoryRepository
  implements IConnectorGitHubRepository
{
  private _gitHubRepositoryRepository: ConnectorGitHubRepositoryRepository;

  constructor() {
    super();
    this._gitHubRepositoryRepository = new ConnectorGitHubRepositoryRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    saveOAuthData(data, "github");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("github");
  }

  get repo(): ConnectorGitHubRepositoryRepository {
    return this._gitHubRepositoryRepository;
  }

  set repo(repo: ConnectorGitHubRepositoryRepository) {
    this._gitHubRepositoryRepository = repo;
  }
}
