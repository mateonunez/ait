import { randomUUID } from "node:crypto";
import {
  AItError,
  GitHubRepositoryEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type GitHubRepositoryDataTarget, drizzleOrm, getPostgresClient, githubRepositories } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGitHubRepoRepository } from "../../../../types/domain/entities/vendors/connector.github.repository.types";

const logger = getLogger();

export class ConnectorGitHubRepoRepository implements IConnectorGitHubRepoRepository {
  private _pgClient = getPostgresClient();

  async saveRepository(
    repository: GitHubRepositoryEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const repositoryId = incremental ? randomUUID() : repository.id;

    try {
      const repositoryData = repository.toPlain<GitHubRepositoryDataTarget>();
      repositoryData.id = repositoryId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx
          .insert(githubRepositories)
          .values(repositoryData)
          .onConflictDoUpdate({
            target: githubRepositories.id,
            set: {
              name: repositoryData.name,
              description: repositoryData.description,
              stars: repositoryData.stars,
              forks: repositoryData.forks,
              url: repositoryData.url,
              language: repositoryData.language,
              fullName: repositoryData.fullName,
              private: repositoryData.private,
              fork: repositoryData.fork,
              archived: repositoryData.archived,
              disabled: repositoryData.disabled,
              visibility: repositoryData.visibility,
              watchersCount: repositoryData.watchersCount,
              openIssuesCount: repositoryData.openIssuesCount,
              size: repositoryData.size,
              defaultBranch: repositoryData.defaultBranch,
              topics: repositoryData.topics,
              isTemplate: repositoryData.isTemplate,
              hasIssues: repositoryData.hasIssues,
              hasProjects: repositoryData.hasProjects,
              hasWiki: repositoryData.hasWiki,
              hasPages: repositoryData.hasPages,
              hasDiscussions: repositoryData.hasDiscussions,
              homepage: repositoryData.homepage,
              pushedAt: repositoryData.pushedAt,
              licenseName: repositoryData.licenseName,
              cloneUrl: repositoryData.cloneUrl,
              sshUrl: repositoryData.sshUrl,
              ownerData: repositoryData.ownerData,
              licenseData: repositoryData.licenseData,
              metadata: repositoryData.metadata,
              updatedAt: new Date(),
            },
          })
          .execute();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save repository:", { repoId: repositoryId, error: message });
      throw new AItError(
        "GITHUB_SAVE_REPOSITORY",
        `Failed to save repository ${repositoryId}: ${message}`,
        { id: repositoryId },
        error,
      );
    }
  }

  async saveRepositories(repos: GitHubRepositoryEntity[]): Promise<void> {
    if (!repos.length) {
      return;
    }

    await Promise.all(repos.map((repo) => this.saveRepository(repo)));
  }

  async getRepository(id: string): Promise<GitHubRepositoryEntity | null> {
    logger.info("Getting repository from GitHub repository", { id });
    return null;
  }

  async fetchRepositories(): Promise<GitHubRepositoryEntity[]> {
    logger.info("Getting repositories from GitHub repository");
    return [];
  }

  async getRepositoriesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubRepositoryEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [repositories, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(githubRepositories)
        .orderBy(drizzleOrm.desc(githubRepositories.pushedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(githubRepositories),
    ]);

    return buildPaginatedResponse(
      repositories.map((repo) => GitHubRepositoryEntity.fromPlain(repo as GitHubRepositoryDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
