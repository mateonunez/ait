import type { GitHubRepositoryEntity } from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";
import type { IConnectorGitHubPullRequestRepository } from "./connector.github.pull-request.types";

export interface IConnectorGitHubRepoRepository {
  saveRepository(repository: Partial<GitHubRepositoryEntity>, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveRepositories(repositories: Partial<GitHubRepositoryEntity>[]): Promise<void>;
  getRepository(id: string): Promise<GitHubRepositoryEntity | null>;
  getRepositories(): Promise<GitHubRepositoryEntity[]>;
}

export interface IConnectorGitHubRepository extends IConnectorRepository {
  repo: IConnectorGitHubRepoRepository;
  pullRequest: IConnectorGitHubPullRequestRepository;
}
