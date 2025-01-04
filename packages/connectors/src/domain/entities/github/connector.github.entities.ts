export interface BaseGitHubEntity {
  type: "repository" | "issue" | "pullRequest";
}

/**
 * EXTERNAL
 */
export interface GitHubRepository extends BaseGitHubEntity {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  fork: boolean;
  url: string;
  homepage: string | null;
  language: string | null;
  created_at: string | null;
  updated_at: string | null;
  watchers_count: number;

  [key: string]: any;
  type: "repository"; // <- positionally dependent
}

/**
 * Base entity for GitHub domain objects
 */
export interface BaseGitHubEntity {
  type: "repository" | "issue" | "pullRequest";
}

/**
 * EXTERNAL
 * Represents the raw data from GitHub
 */
export interface GitHubRepositoryExternal extends GitHubRepository, BaseGitHubEntity {
  type: "repository";
}

/**
 * DOMAIN
 * Represents a simplified domain entity
 */
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
  type: "repository";
}

/**
 * Union type for any GitHub domain entity
 */
export type GitHubEntity = GitHubRepositoryEntity;

/**
 * Union type for any GitHub external data representation
 */
export type GitHubData = GitHubRepositoryExternal;
