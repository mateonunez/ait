import { getPostgresClient, githubPullRequests } from "@ait/postgres";
import { connectorGithubPullRequestMapper } from "../../mappers/vendors/connector.github.pull-request.mapper";
import { randomUUID } from "node:crypto";
import type {
  IConnectorGitHubPullRequestRepository,
  GitHubPullRequestEntity,
} from "../../../types/domain/entities/vendors/connector.github.pull-request.types";
import type { IConnectorRepositorySaveOptions } from "../../../types/domain/entities/connector.repository.interface";

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
      throw new Error(`Failed to save pull request ${pullRequestId}: ${error.message}`);
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

  async getPullRequests(): Promise<GitHubPullRequestEntity[]> {
    console.log("Getting pull requests from GitHub repository");
    return [];
  }
}
