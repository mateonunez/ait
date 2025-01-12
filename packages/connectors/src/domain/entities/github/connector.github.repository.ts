import { getPostgresClient, githubRepositories, type OAuthTokenDataTarget } from "@ait/postgres";
import { connectorGithubMapper } from "../../mappers/github/connector.github.mapper";
import type { GitHubRepositoryEntity } from "./connector.github.entities";
import type {
  IConnectorGitHubRepository,
  IConnectorGitHubRepositoryRepository,
  IConnectorGitHubRepositoryRepositoryOptions,
} from "./connector.github.repository.interface";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth.interface";
import { saveOAuthData, getOAuthData } from "../../../shared/auth/lib/oauth/connector.oauth.utils";
import { randomUUID } from "node:crypto";

const _pgClient = getPostgresClient();

// I'm so sorry for the name of this class
export class ConnectorGitHubRepositoryRepository implements IConnectorGitHubRepositoryRepository {
  async saveRepository(
    repository: GitHubRepositoryEntity,
    options: IConnectorGitHubRepositoryRepositoryOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const repositoryId = incremental ? randomUUID() : repository.id;

    try {
      const repositoryData = connectorGithubMapper.domainToDataTarget(repository);
      repositoryData.id = repositoryId;

      await _pgClient.db.transaction(async (tx) => {
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
      await Promise.all(repos.map((repository) => this.saveRepository(repository)));
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
