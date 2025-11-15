import type { GitHubRepositoryEntity, PaginatedResponse, PaginationParams } from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";
import type { IConnectorGitHubPullRequestRepository } from "./connector.github.pull-request.types";
import type { IConnectorGitHubCommitRepository } from "./connector.github.commit.types";

export interface IConnectorGitHubRepoRepository {
  saveRepository(repository: Partial<GitHubRepositoryEntity>, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveRepositories(repositories: Partial<GitHubRepositoryEntity>[]): Promise<void>;
  getRepository(id: string): Promise<GitHubRepositoryEntity | null>;
  fetchRepositories(): Promise<GitHubRepositoryEntity[]>;
  getRepositoriesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubRepositoryEntity>>;
}

export interface IConnectorGitHubRepository extends IConnectorRepository {
  repo: IConnectorGitHubRepoRepository;
  pullRequest: IConnectorGitHubPullRequestRepository;
  commit: IConnectorGitHubCommitRepository;
}
