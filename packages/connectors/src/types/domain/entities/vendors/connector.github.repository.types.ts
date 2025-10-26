import type { components as GitHubComponents } from "../../../openapi/openapi.github.types";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";
import type {
  GitHubPullRequestEntity,
  GitHubPullRequestExternal,
  IConnectorGitHubPullRequestRepository,
} from "./connector.github.pull-request.types";

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
  pullRequest: IConnectorGitHubPullRequestRepository;
}

export interface BaseGitHubEntity {
  __type: "repository" | "issue" | "pull_request";
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
  fullName: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: string;
  watchersCount: number;
  openIssuesCount: number;
  size: number;
  defaultBranch: string;
  topics: string[];
  isTemplate: boolean;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  hasDiscussions: boolean;
  homepage: string | null;
  pushedAt: Date | null;
  licenseName: string | null;
  cloneUrl: string;
  sshUrl: string;
  ownerData: Record<string, unknown> | null;
  licenseData: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  updatedAt: string | null;
  __type: "repository";
}

export type GitHubEntity = GitHubRepositoryEntity | GitHubPullRequestEntity;
export type GitHubExternal = GitHubRepositoryExternal | GitHubPullRequestExternal;
