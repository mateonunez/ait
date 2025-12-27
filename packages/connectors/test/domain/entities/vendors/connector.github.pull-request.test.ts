import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { closePostgresConnection, drizzleOrm, getPostgresClient, githubPullRequests } from "@ait/postgres";
import type { GitHubPullRequestEntity } from "../../../../src/domain/entities/github/github-pull-request.entity";
import { ConnectorGitHubPullRequestRepository } from "../../../../src/domain/entities/vendors/github/connector.github.pull-request.repository";

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
            repositoryName: "ait",
            repositoryFullName: "mateonunez/ait",
            mergeable: true,
            rebaseable: true,
            mergeableState: "clean",
            maintainerCanModify: false,
            authorAssociation: "OWNER",
            autoMerge: null,
            activeLockReason: null,
            prCreatedAt: new Date(),
            prUpdatedAt: new Date(),
            userData: null,
            assigneeData: null,
            assigneesData: null,
            mergedByData: { login: "merger", id: 999 },
            labels: null,
            milestoneData: null,
            requestedReviewersData: null,
            requestedTeamsData: null,
            headRepoData: null,
            baseRepoData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
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
            repositoryName: "ait",
            repositoryFullName: "mateonunez/ait",
            mergeable: null,
            rebaseable: null,
            mergeableState: null,
            maintainerCanModify: true,
            authorAssociation: "CONTRIBUTOR",
            autoMerge: null,
            activeLockReason: null,
            prCreatedAt: new Date(),
            prUpdatedAt: new Date(),
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
            requestedTeamsData: null,
            headRepoData: null,
            baseRepoData: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            __type: "pull_request",
          },
        ];

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

    describe("getPullRequestsPaginated", () => {
      it("should return paginated pull requests", async () => {
        const prs: GitHubPullRequestEntity[] = Array.from({ length: 15 }, (_, i) => ({
          id: `pr-${i + 1}`,
          number: i + 1,
          title: `PR ${i + 1}`,
          body: `Body ${i + 1}`,
          state: i % 2 === 0 ? "open" : "closed",
          draft: false,
          locked: false,
          htmlUrl: `https://github.com/mateonunez/ait/pull/${i + 1}`,
          diffUrl: null,
          patchUrl: null,
          issueUrl: null,
          merged: i % 3 === 0,
          mergedAt: i % 3 === 0 ? new Date() : null,
          closedAt: i % 2 === 1 ? new Date() : null,
          mergeCommitSha: null,
          commits: i + 1,
          additions: (i + 1) * 10,
          deletions: (i + 1) * 2,
          changedFiles: i + 1,
          comments: i,
          reviewComments: i,
          headRef: `feature-${i + 1}`,
          headSha: `sha-${i + 1}`,
          baseRef: "main",
          baseSha: "base-sha",
          repositoryId: "repo-1",
          repositoryName: "ait",
          repositoryFullName: "mateonunez/ait",
          mergeable: true,
          rebaseable: true,
          mergeableState: "clean",
          maintainerCanModify: false,
          authorAssociation: "OWNER",
          autoMerge: null,
          activeLockReason: null,
          prCreatedAt: new Date(Date.now() + i * 1000),
          prUpdatedAt: new Date(Date.now() + i * 1000),
          userData: null,
          assigneeData: null,
          assigneesData: null,
          mergedByData: null,
          labels: null,
          milestoneData: null,
          requestedReviewersData: null,
          requestedTeamsData: null,
          headRepoData: null,
          baseRepoData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "pull_request",
        })) as unknown as GitHubPullRequestEntity[];

        await prRepository.savePullRequests(prs);

        const result = await prRepository.getPullRequestsPaginated({ page: 1, limit: 5 });
        assert.equal(result.data.length, 5);
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.limit, 5);
        assert.equal(result.pagination.total, 15);
        assert.equal(result.pagination.totalPages, 3);
      });

      it("should return correct page for second page", async () => {
        const prs: GitHubPullRequestEntity[] = Array.from({ length: 10 }, (_, i) => ({
          id: `pr-${i + 1}`,
          number: i + 1,
          title: `PR ${i + 1}`,
          body: `Body ${i + 1}`,
          state: "open",
          draft: false,
          locked: false,
          htmlUrl: `https://github.com/mateonunez/ait/pull/${i + 1}`,
          diffUrl: null,
          patchUrl: null,
          issueUrl: null,
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
          repositoryName: "ait",
          repositoryFullName: "mateonunez/ait",
          mergeable: true,
          rebaseable: true,
          mergeableState: "clean",
          maintainerCanModify: true,
          authorAssociation: "OWNER",
          autoMerge: null,
          activeLockReason: null,
          prCreatedAt: new Date(Date.now() + i * 1000),
          prUpdatedAt: new Date(Date.now() + i * 1000),
          userData: null,
          assigneeData: null,
          assigneesData: null,
          mergedByData: null,
          labels: null,
          milestoneData: null,
          requestedReviewersData: null,
          requestedTeamsData: null,
          headRepoData: null,
          baseRepoData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "pull_request",
        })) as unknown as GitHubPullRequestEntity[];

        await prRepository.savePullRequests(prs);

        const result = await prRepository.getPullRequestsPaginated({ page: 2, limit: 3 });
        assert.equal(result.data.length, 3);
        assert.equal(result.pagination.page, 2);
        assert.equal(result.pagination.limit, 3);
        assert.equal(result.pagination.total, 10);
        assert.equal(result.pagination.totalPages, 4);
      });

      it("should return empty array when no pull requests exist", async () => {
        const result = await prRepository.getPullRequestsPaginated({ page: 1, limit: 10 });
        assert.equal(result.data.length, 0);
        assert.equal(result.pagination.total, 0);
        assert.equal(result.pagination.totalPages, 0);
      });
    });
  });
});
