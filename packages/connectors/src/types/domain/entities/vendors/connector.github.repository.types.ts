import type { components as GitHubComponents } from "../../../openapi/openapi.github.types";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

/**
 * Repository interface for GitHub repositories
 */
export interface IConnectorGitHubRepoRepository {
  saveRepository(repository: Partial<GitHubRepositoryEntity>, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveRepositories(repositories: Partial<GitHubRepositoryEntity>[]): Promise<void>;
  getRepository(id: string): Promise<GitHubRepositoryEntity | null>;
  getRepositories(): Promise<GitHubRepositoryEntity[]>;
}

export interface IConnectorGitHubRepository extends IConnectorRepository {
  repo: IConnectorGitHubRepoRepository;
}

export interface BaseGitHubEntity {
  __type: "repository" | "issue" | "pullRequest";
}

type GitHubRepository = GitHubComponents["schemas"]["repository"];
export interface GitHubRepositoryExternal extends Omit<GitHubRepository, "__type">, BaseGitHubEntity {
  __type: "repository";
}

export interface GitHubRepositoryEntity extends BaseGitHubEntity {
  id: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
  createdAt: string | null;
  updatedAt: string | null;
  __type: "repository";
}

export type GitHubEntity = GitHubRepositoryEntity;
export type GitHubExternal = GitHubRepositoryExternal;
