import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm, githubPullRequests } from "@ait/postgres";
import { ConnectorGitHubPullRequestRepository } from "../../../../src/domain/entities/vendors/connector.github.pull-request.repository";
import type { GitHubPullRequestEntity } from "../../../../src/types/domain/entities/vendors/connector.github.pull-request.types";

describe("ConnectorGitHubPullRequestRepository", () => {
  const prRepository: ConnectorGitHubPullRequestRepository = new ConnectorGitHubPullRequestRepository();
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorGitHubPullRequestRepository", () => {
    beforeEach(async () => {
      await db.delete(githubPullRequests).execute();
    });

    describe("savePullRequest", () => {
      it("should save pull request successfully", async () => {
        const pr: GitHubPullRequestEntity = {
          id: "test-pr-id",
          number: 123,
          title: "Add new feature",
          body: "This PR adds a new feature",
          state: "open",
          draft: false,
          locked: false,
          htmlUrl: "https://github.com/mateonunez/ait/pull/123",
          diffUrl: "https://github.com/mateonunez/ait/pull/123.diff",
          patchUrl: "https://github.com/mateonunez/ait/pull/123.patch",
          issueUrl: "https://api.github.com/repos/mateonunez/ait/issues/123",
          merged: false,
          mergedAt: null,
          closedAt: null,
          mergeCommitSha: null,
          commits: 5,
          additions: 150,
          deletions: 20,
          changedFiles: 8,
          comments: 3,
          reviewComments: 2,
          headRef: "feature-branch",
          headSha: "abc123",
          baseRef: "main",
          baseSha: "def456",
          repositoryId: "repo-123",
          mergeable: true,
          maintainerCanModify: true,
          userData: { login: "testuser", id: 12345 },
          assigneeData: null,
          assigneesData: null,
          mergedByData: null,
          labels: [{ name: "feature", color: "00ff00" }],
          milestoneData: null,
          requestedReviewersData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "pull_request",
        } as unknown as GitHubPullRequestEntity;

        await prRepository.savePullRequest(pr);

        const saved = await db
          .select()
          .from(githubPullRequests)
          .where(drizzleOrm.eq(githubPullRequests.id, pr.id))
          .execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, pr.id);
        assert.equal(saved[0].number, pr.number);
        assert.equal(saved[0].title, pr.title);
      });

      it("should throw on missing pull request ID", async () => {
        const pr = {} as GitHubPullRequestEntity;

        await assert.rejects(() => prRepository.savePullRequest(pr), {
          message: /Failed to save/,
        });
      });
    });

    describe("savePullRequests", () => {
      it("should save multiple pull requests", async () => {
        const prs: GitHubPullRequestEntity[] = [
          {
            id: "pr-1",
            number: 1,
            title: "PR 1",
            body: "First PR",
            state: "merged",
            draft: false,
            locked: false,
            htmlUrl: "https://github.com/mateonunez/ait/pull/1",
            diffUrl: null,
            patchUrl: null,
            issueUrl: null,
            merged: true,
            mergedAt: new Date(),
            closedAt: new Date(),
            mergeCommitSha: "merge123",
            commits: 3,
            additions: 100,
            deletions: 10,
            changedFiles: 5,
            comments: 1,
            reviewComments: 1,
            headRef: "feature-1",
            headSha: "sha1",
            baseRef: "main",
            baseSha: "base1",
            repositoryId: "repo-1",
            mergeable: true,
            maintainerCanModify: false,
            userData: null,
            assigneeData: null,
            assigneesData: null,
            mergedByData: { login: "merger", id: 999 },
            labels: null,
            milestoneData: null,
            requestedReviewersData: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __type: "pull_request",
          },
          {
            id: "pr-2",
            number: 2,
            title: "PR 2",
            body: "Second PR",
            state: "open",
            draft: true,
            locked: false,
            htmlUrl: "https://github.com/mateonunez/ait/pull/2",
            diffUrl: null,
            patchUrl: null,
            issueUrl: null,
            merged: false,
            mergedAt: null,
            closedAt: null,
            mergeCommitSha: null,
            commits: 2,
            additions: 50,
            deletions: 5,
            changedFiles: 3,
            comments: 0,
            reviewComments: 0,
            headRef: "feature-2",
            headSha: "sha2",
            baseRef: "main",
            baseSha: "base2",
            repositoryId: "repo-1",
            mergeable: null,
            maintainerCanModify: true,
            userData: null,
            assigneeData: null,
            assigneesData: null,
            mergedByData: null,
            labels: [
              { name: "wip", color: "ff0000" },
              { name: "draft", color: "aaaaaa" },
            ],
            milestoneData: { title: "v1.0" },
            requestedReviewersData: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __type: "pull_request",
          },
        ] as GitHubPullRequestEntity[];

        await prRepository.savePullRequests(prs);

        const saved = await db.select().from(githubPullRequests).execute();
        assert.equal(saved.length, 2);
      });

      it("should do nothing with empty array", async () => {
        await prRepository.savePullRequests([]);
        const saved = await db.select().from(githubPullRequests).execute();
        assert.equal(saved.length, 0);
      });
    });
  });
});
