import { randomUUID } from "node:crypto";
import {
  AItError,
  GitHubIssueEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type GitHubIssueDataTarget, drizzleOrm, getPostgresClient, githubIssues } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGitHubIssueRepository } from "../../../../types/domain/entities/vendors/connector.github.issue.types";

const logger = getLogger();

export class ConnectorGitHubIssueRepository implements IConnectorGitHubIssueRepository {
  private _pgClient = getPostgresClient();

  async saveIssue(
    issue: GitHubIssueEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const issueId = incremental ? randomUUID() : issue.id;

    try {
      const issueData = issue.toPlain<GitHubIssueDataTarget>();
      issueData.id = issueId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx
          .insert(githubIssues)
          .values(issueData)
          .onConflictDoUpdate({
            target: githubIssues.id,
            set: {
              number: issueData.number,
              title: issueData.title,
              body: issueData.body,
              state: issueData.state,
              stateReason: issueData.stateReason,
              locked: issueData.locked,
              htmlUrl: issueData.htmlUrl,
              comments: issueData.comments,
              repositoryId: issueData.repositoryId,
              repositoryName: issueData.repositoryName,
              repositoryFullName: issueData.repositoryFullName,
              issueCreatedAt: issueData.issueCreatedAt,
              issueUpdatedAt: issueData.issueUpdatedAt,
              issueClosedAt: issueData.issueClosedAt,
              authorData: issueData.authorData,
              assigneeData: issueData.assigneeData,
              assigneesData: issueData.assigneesData,
              labels: issueData.labels,
              milestoneData: issueData.milestoneData,
              reactionsData: issueData.reactionsData,
              isPullRequest: issueData.isPullRequest,
              updatedAt: new Date(),
            },
          })
          .execute();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save issue:", { issueId: issueId, error: message });
      throw new AItError("GITHUB_SAVE_ISSUE", `Failed to save issue ${issueId}: ${message}`, { id: issueId }, error);
    }
  }

  async saveIssues(issues: GitHubIssueEntity[]): Promise<void> {
    if (!issues.length) {
      return;
    }

    await Promise.all(issues.map((issue) => this.saveIssue(issue)));
  }

  async getIssue(id: string): Promise<GitHubIssueEntity | null> {
    logger.debug("Getting issue from GitHub repository", { id });
    return null;
  }

  async fetchIssues(): Promise<GitHubIssueEntity[]> {
    logger.debug("Getting issues from GitHub repository");
    return [];
  }

  async getIssuesPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubIssueEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [issues, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(githubIssues)
        .orderBy(drizzleOrm.desc(githubIssues.issueUpdatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(githubIssues),
    ]);

    return buildPaginatedResponse(
      issues.map((issue) => GitHubIssueEntity.fromPlain(issue as GitHubIssueDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
