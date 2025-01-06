import type { IConnectorRepository } from "../connector.repository.interface";
import type { GitHubRepositoryEntity } from "./connector.github.entities";

export interface IConnectorGitHubRepositoryRepository {
  saveRepository(repository: Partial<GitHubRepositoryEntity>): Promise<void>;
  saveRepositories(repositories: Partial<GitHubRepositoryEntity>[]): Promise<void>;

  getRepository(id: string): Promise<GitHubRepositoryEntity | null>;
  getRepositories(): Promise<GitHubRepositoryEntity[]>;
}

/**
 * Union of all GitHub repositories
 */
export interface IConnectorGitHubRepository extends IConnectorRepository {
  repo: IConnectorGitHubRepositoryRepository;
}
