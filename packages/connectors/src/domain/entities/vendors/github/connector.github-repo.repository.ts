import { randomUUID } from "node:crypto";
import {
  AItError,
  type GitHubRepositoryEntity,
  type PaginatedResponse,
  type PaginationParams,
  getLogger,
} from "@ait/core";
import { drizzleOrm, getPostgresClient, githubRepositories } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGitHubRepoRepository } from "../../../../types/domain/entities/vendors/connector.github.repository.types";
import { repositoryDataTargetToDomain, repositoryDomainToDataTarget } from "../../../entities/github";

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
      const repositoryData = repositoryDomainToDataTarget(repository);
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
    } catch (error: any) {
      logger.error("Failed to save repository:", { repoId: repositoryId, error });
      throw new AItError(
        "GITHUB_SAVE_REPOSITORY",
        `Failed to save repository ${repositoryId}: ${error.message}`,
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
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [repositories, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(githubRepositories)
        .orderBy(drizzleOrm.desc(githubRepositories.pushedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(githubRepositories),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: repositories.map((repo) => repositoryDataTargetToDomain(repo)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
