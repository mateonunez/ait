import { getPostgresClient, githubRepositories, type OAuthTokenDataTarget } from "@ait/postgres";
import { connectorGithubMapper } from "../../mappers/vendors/connector.github.mapper";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { saveOAuthData, getOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import { randomUUID } from "node:crypto";
import type { IConnectorRepository } from "../connector.repository.interface";

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

export interface IConnectorGitHubRepositoryRepositoryOptions {
  incremental: boolean;
}

export interface IConnectorGitHubRepositoryRepository {
  saveRepository(
    repository: Partial<GitHubRepositoryEntity>,
    options?: IConnectorGitHubRepositoryRepositoryOptions,
  ): Promise<void>;
  saveRepositories(repositories: Partial<GitHubRepositoryEntity>[]): Promise<void>;

  getRepository(id: string): Promise<GitHubRepositoryEntity | null>;
  getRepositories(): Promise<GitHubRepositoryEntity[]>;
}
/**
 * Union of all GitHub repositories
 */

export interface IConnectorGitHubRepository extends IConnectorRepository {
  repo: IConnectorGitHubRepositoryRepository;
} /**
 * Base interface for all GitHub entities
 */
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
