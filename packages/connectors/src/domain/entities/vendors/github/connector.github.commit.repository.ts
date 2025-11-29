import { AItError, type GitHubCommitEntity, type PaginatedResponse, type PaginationParams, getLogger } from "@ait/core";
import { getPostgresClient, githubCommits, drizzleOrm } from "@ait/postgres";
import { connectorGithubCommitMapper } from "../../../mappers/vendors/connector.github.commit.mapper";
import type { IConnectorGitHubCommitRepository } from "../../../../types/domain/entities/vendors/connector.github.commit.types";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";

const logger = getLogger();

export class ConnectorGitHubCommitRepository implements IConnectorGitHubCommitRepository {
  private _pgClient = getPostgresClient();

  async saveCommit(
    commit: GitHubCommitEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    try {
      const commitData = connectorGithubCommitMapper.domainToDataTarget(commit);

      await this._pgClient.db.transaction(async (tx) => {
        await tx
          .insert(githubCommits)
          .values(commitData)
          .onConflictDoUpdate({
            target: githubCommits.sha,
            set: {
              message: commitData.message,
              messageBody: commitData.messageBody,
              htmlUrl: commitData.htmlUrl,
              commentsUrl: commitData.commentsUrl,
              nodeId: commitData.nodeId,
              authorName: commitData.authorName,
              authorEmail: commitData.authorEmail,
              authorDate: commitData.authorDate,
              committerName: commitData.committerName,
              committerEmail: commitData.committerEmail,
              committerDate: commitData.committerDate,
              treeSha: commitData.treeSha,
              treeUrl: commitData.treeUrl,
              parentShas: commitData.parentShas,
              additions: commitData.additions,
              deletions: commitData.deletions,
              total: commitData.total,
              repositoryId: commitData.repositoryId,
              repositoryName: commitData.repositoryName,
              repositoryFullName: commitData.repositoryFullName,
              authorData: commitData.authorData,
              committerData: commitData.committerData,
              filesData: commitData.filesData,
              verification: commitData.verification,
              metadata: commitData.metadata,
              updatedAt: new Date(),
            },
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save commit:", { sha: commit.sha, error });
      throw new AItError(
        "GITHUB_SAVE_COMMIT",
        `Failed to save commit ${commit.sha}: ${error.message}`,
        { sha: commit.sha },
        error,
      );
    }
  }

  async saveCommits(commits: GitHubCommitEntity[]): Promise<void> {
    if (!commits.length) {
      return;
    }

    await Promise.all(commits.map((commit) => this.saveCommit(commit)));
  }

  async getCommit(sha: string): Promise<GitHubCommitEntity | null> {
    logger.debug("Getting commit from GitHub repository", { sha });
    return null;
  }

  async fetchCommits(): Promise<GitHubCommitEntity[]> {
    logger.debug("Getting commits from GitHub repository");
    return [];
  }

  async getCommitsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubCommitEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [commits, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(githubCommits)
        .orderBy(drizzleOrm.desc(githubCommits.committerDate))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(githubCommits),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: commits.map((commit) => connectorGithubCommitMapper.dataTargetToDomain(commit)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
