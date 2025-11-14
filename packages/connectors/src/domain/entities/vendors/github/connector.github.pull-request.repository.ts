import { AItError, type GitHubPullRequestEntity, type PaginatedResponse, type PaginationParams } from "@ait/core";
import { getPostgresClient, githubPullRequests, drizzleOrm } from "@ait/postgres";
import { connectorGithubPullRequestMapper } from "../../../mappers/vendors/connector.github.pull-request.mapper";
import { randomUUID } from "node:crypto";
import type { IConnectorGitHubPullRequestRepository } from "../../../../types/domain/entities/vendors/connector.github.pull-request.types";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";

export class ConnectorGitHubPullRequestRepository implements IConnectorGitHubPullRequestRepository {
  private _pgClient = getPostgresClient();

  async savePullRequest(
    pullRequest: GitHubPullRequestEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const pullRequestId = incremental ? randomUUID() : pullRequest.id;

    try {
      const pullRequestData = connectorGithubPullRequestMapper.domainToDataTarget(pullRequest);
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
    } catch (error: any) {
      console.error("Failed to save pull request:", { prId: pullRequestId, error });
      throw new AItError(
        "GITHUB_SAVE_PULL_REQUEST",
        `Failed to save pull request ${pullRequestId}: ${error.message}`,
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
    console.log("Getting pull request from GitHub repository", id);
    return null;
  }

  async fetchPullRequests(): Promise<GitHubPullRequestEntity[]> {
    console.log("Getting pull requests from GitHub repository");
    return [];
  }

  async getPullRequestsPaginated(params: PaginationParams): Promise<PaginatedResponse<GitHubPullRequestEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [pullRequests, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(githubPullRequests)
        .orderBy(drizzleOrm.desc(githubPullRequests.prUpdatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(githubPullRequests),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: pullRequests.map((pr) => connectorGithubPullRequestMapper.dataTargetToDomain(pr)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
