import { getPostgresClient, githubRepositories } from "@ait/postgres";
import { connectorGithubMapper } from "../../mappers/github/connector.github.mapper";
import type { GitHubRepositoryEntity } from "./connector.github.entities";
import type { IConnectorGitHubRepositoryRepository } from "./connector.github.repository.interface";

// I'm so sorry for the name of this class
export class ConnectorGitHubRepositoryRepository implements IConnectorGitHubRepositoryRepository {
  private _pgClient = getPostgresClient();

  async saveRepository(repository: GitHubRepositoryEntity): Promise<void> {
    if (!repository?.id) {
      throw new Error("Invalid repository: missing repository ID");
    }

    try {
      const repositoryData = connectorGithubMapper.domainToDataTarget(repository);

      await this._pgClient.db.transaction(async (tx) => {
        await tx.insert(githubRepositories).values(repositoryData).onConflictDoNothing().execute();
      });

      console.debug("Repository saved successfully:", { repoId: repository.id });
    } catch (error: any) {
      console.error("Failed to save repository:", { repoId: repository.id, error });
      throw new Error(`Failed to save repository ${repository.id}: ${error.message}`);
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
  implements IConnectorGitHubRepositoryRepository
{
  private _gitHubRepositoryRepository: ConnectorGitHubRepositoryRepository;

  constructor() {
    super();
    this._gitHubRepositoryRepository = new ConnectorGitHubRepositoryRepository();
  }

  get repositoryRepository(): ConnectorGitHubRepositoryRepository {
    return this._gitHubRepositoryRepository;
  }

  set repositoryRepository(repositoryRepository: ConnectorGitHubRepositoryRepository) {
    this._gitHubRepositoryRepository = repositoryRepository;
  }
}
