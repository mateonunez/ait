import type { GitHubRepositoryEntity, PaginatedResponse, PaginationParams } from "@ait/core";

export type { GitHubRepositoryEntity };
import type { IConnectorGitHubFileRepository } from "../../../../domain/entities/vendors/github/connector.github.file.repository";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";
import type { IConnectorGitHubCommitRepository } from "./connector.github.commit.types";
import type { IConnectorGitHubPullRequestRepository } from "./connector.github.pull-request.types";

export interface IConnectorGitHubRepoRepository {
  saveRepository(repository: GitHubRepositoryEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveRepositories(repositories: GitHubRepositoryEntity[]): Promise<void>;
  getRepository(id: string): Promise<GitHubRepositoryEntity | null>;
  fetchRepositories(): Promise<GitHubRepositoryEntity[]>;
  getRepositoriesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubRepositoryEntity>>;
}

export interface IConnectorGitHubRepository extends IConnectorRepository {
  repo: IConnectorGitHubRepoRepository;
  pullRequest: IConnectorGitHubPullRequestRepository;
  commit: IConnectorGitHubCommitRepository;
  file: IConnectorGitHubFileRepository;
}
