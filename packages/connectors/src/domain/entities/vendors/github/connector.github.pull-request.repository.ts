import { randomUUID } from "node:crypto";
import {
  AItError,
  GitHubPullRequestEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type GitHubPullRequestDataTarget, drizzleOrm, getPostgresClient, githubPullRequests } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGitHubPullRequestRepository } from "../../../../types/domain/entities/vendors/connector.github.pull-request.types";

const logger = getLogger();

export class ConnectorGitHubPullRequestRepository implements IConnectorGitHubPullRequestRepository {
  private _pgClient = getPostgresClient();

  async savePullRequest(
    pullRequest: GitHubPullRequestEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const pullRequestId = incremental ? randomUUID() : pullRequest.id;

    try {
      const pullRequestData = pullRequest.toPlain<GitHubPullRequestDataTarget>();
      pullRequestData.id = pullRequestId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx
          .insert(githubPullRequests)
          .values(pullRequestData)
          .onConflictDoUpdate({
            target: githubPullRequests.id,
            set: {
              number: pullRequestData.number,
              title: pullRequestData.title,
              body: pullRequestData.body,
              state: pullRequestData.state,
              draft: pullRequestData.draft,
              locked: pullRequestData.locked,
              htmlUrl: pullRequestData.htmlUrl,
              diffUrl: pullRequestData.diffUrl,
              patchUrl: pullRequestData.patchUrl,
              issueUrl: pullRequestData.issueUrl,
              merged: pullRequestData.merged,
              mergedAt: pullRequestData.mergedAt,
              closedAt: pullRequestData.closedAt,
              mergeCommitSha: pullRequestData.mergeCommitSha,
              commits: pullRequestData.commits,
              additions: pullRequestData.additions,
              deletions: pullRequestData.deletions,
              changedFiles: pullRequestData.changedFiles,
              comments: pullRequestData.comments,
              reviewComments: pullRequestData.reviewComments,
              headRef: pullRequestData.headRef,
              headSha: pullRequestData.headSha,
              baseRef: pullRequestData.baseRef,
              baseSha: pullRequestData.baseSha,
              repositoryId: pullRequestData.repositoryId,
              mergeable: pullRequestData.mergeable,
              maintainerCanModify: pullRequestData.maintainerCanModify,
              userData: pullRequestData.userData,
              assigneeData: pullRequestData.assigneeData,
              assigneesData: pullRequestData.assigneesData,
              mergedByData: pullRequestData.mergedByData,
              labels: pullRequestData.labels,
              milestoneData: pullRequestData.milestoneData,
              requestedReviewersData: pullRequestData.requestedReviewersData,
              updatedAt: new Date(),
            },
          })
          .execute();
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save pull request:", { prId: pullRequestId, error: message });
      throw new AItError(
        "GITHUB_SAVE_PULL_REQUEST",
        `Failed to save pull request ${pullRequestId}: ${message}`,
        { id: pullRequestId },
        error,
      );
    }
  }

  async savePullRequests(prs: GitHubPullRequestEntity[]): Promise<void> {
    if (!prs.length) {
      return;
    }

    await Promise.all(prs.map((pr) => this.savePullRequest(pr)));
  }

  async getPullRequest(id: string): Promise<GitHubPullRequestEntity | null> {
    logger.debug("Getting pull request from GitHub repository", { id });
    return null;
  }

  async fetchPullRequests(): Promise<GitHubPullRequestEntity[]> {
    logger.debug("Getting pull requests from GitHub repository");
    return [];
  }

  async getPullRequestsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubPullRequestEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [pullRequests, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(githubPullRequests)
        .orderBy(drizzleOrm.desc(githubPullRequests.prUpdatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(githubPullRequests),
    ]);

    return buildPaginatedResponse(
      pullRequests.map((pr) => GitHubPullRequestEntity.fromPlain(pr as GitHubPullRequestDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
