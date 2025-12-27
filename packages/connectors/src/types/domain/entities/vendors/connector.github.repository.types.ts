import type { PaginatedResponse, PaginationParams } from "@ait/core";
import type { GitHubRepositoryEntity } from "../../../../domain/entities/github/github-repository.entity";

export type { GitHubRepositoryEntity };
import type { IConnectorGitHubFileRepository } from "../../../../domain/entities/vendors/github/connector.github.file.repository";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";
import type { IConnectorGitHubCommitRepository } from "./connector.github.commit.types";
import type { IConnectorGitHubPullRequestRepository } from "./connector.github.pull-request.types";

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
  file: IConnectorGitHubFileRepository;
}
