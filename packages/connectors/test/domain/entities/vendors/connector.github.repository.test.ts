import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { closePostgresConnection, drizzleOrm, getPostgresClient } from "@ait/postgres";
import { githubCommits, githubPullRequests, githubRepositories } from "@ait/postgres";
import type { GitHubCommitEntity } from "../../../../src/domain/entities/github/github-commit.entity";
import type { GitHubPullRequestEntity } from "../../../../src/domain/entities/github/github-pull-request.entity";
import type { GitHubRepositoryEntity } from "../../../../src/domain/entities/github/github-repository.entity";
import { ConnectorGitHubRepoRepository } from "../../../../src/domain/entities/vendors/github/connector.github-repo.repository";
import { ConnectorGitHubCommitRepository } from "../../../../src/domain/entities/vendors/github/connector.github.commit.repository";
import { ConnectorGitHubPullRequestRepository } from "../../../../src/domain/entities/vendors/github/connector.github.pull-request.repository";

describe("ConnectorGitHubRepository", () => {
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorGitHubRepoRepository", () => {
    const repoRepository: ConnectorGitHubRepoRepository = new ConnectorGitHubRepoRepository();
    beforeEach(async () => {
      await db.delete(githubRepositories).execute();
    });

    describe("saveRepository", () => {
      it("should save repository successfully", async () => {
        const repo: GitHubRepositoryEntity = {
          id: "test-id",
          name: "Test Repository",
          description: "Test Description",
          stars: 100,
          forks: 50,
          language: "TypeScript",
          url: "https://github.com/mateonunez/ait",
          fullName: "mateonunez/test-repository",
          private: false,
          fork: false,
          archived: false,
          disabled: false,
          visibility: "public",
          watchersCount: 10,
          openIssuesCount: 5,
          size: 1024,
          defaultBranch: "main",
          topics: ["typescript", "testing"],
          isTemplate: false,
          hasIssues: true,
          hasProjects: true,
          hasWiki: true,
          hasPages: false,
          hasDiscussions: false,
          homepage: null,
          pushedAt: new Date(),
          licenseName: "MIT",
          cloneUrl: "https://github.com/mateonunez/test-repository.git",
          sshUrl: "git@github.com:mateonunez/test-repository.git",
          ownerData: null,
          licenseData: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "repository",
        } as unknown as GitHubRepositoryEntity;

        await repoRepository.saveRepository(repo);

        const saved = await db
          .select()
          .from(githubRepositories)
          .where(drizzleOrm.eq(githubRepositories.id, repo.id))
          .execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, repo.id);
      });

      it("should throw on missing repository ID", async () => {
        const repo = {} as GitHubRepositoryEntity;

        await assert.rejects(() => repoRepository.saveRepository(repo), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveRepositories", () => {
      it("should save multiple repositories", async () => {
        const repos: GitHubRepositoryEntity[] = [
          {
            id: "repo-1",
            name: "Repository 1",
            description: "Description 1",
            stars: 100,
            forks: 50,
            language: "TypeScript",
            url: "https://github.com/mateonunez/repo1",
            fullName: "mateonunez/repo1",
            private: false,
            fork: false,
            archived: false,
            disabled: false,
            visibility: "public",
            watchersCount: 10,
            openIssuesCount: 5,
            size: 1024,
            defaultBranch: "main",
            topics: ["typescript"],
            isTemplate: false,
            hasIssues: true,
            hasProjects: true,
            hasWiki: true,
            hasPages: false,
            hasDiscussions: false,
            homepage: null,
            pushedAt: new Date(),
            licenseName: "MIT",
            cloneUrl: "https://github.com/mateonunez/repo1.git",
            sshUrl: "git@github.com:mateonunez/repo1.git",
            ownerData: null,
            licenseData: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            __type: "repository",
          },
          {
            id: "repo-2",
            name: "Repository 2",
            description: "Description 2",
            stars: 200,
            forks: 100,
            language: "JavaScript",
            url: "https://github.com/mateonunez/repo2",
            fullName: "mateonunez/repo2",
            private: false,
            fork: false,
            archived: false,
            disabled: false,
            visibility: "public",
            watchersCount: 20,
            openIssuesCount: 10,
            size: 2048,
            defaultBranch: "main",
            topics: ["javascript"],
            isTemplate: false,
            hasIssues: true,
            hasProjects: true,
            hasWiki: true,
            hasPages: false,
            hasDiscussions: false,
            homepage: null,
            pushedAt: new Date(),
            licenseName: "Apache-2.0",
            cloneUrl: "https://github.com/mateonunez/repo2.git",
            sshUrl: "git@github.com:mateonunez/repo2.git",
            ownerData: null,
            licenseData: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            __type: "repository",
          },
        ] as GitHubRepositoryEntity[];

        await repoRepository.saveRepositories(repos);

        const saved = await db.select().from(githubRepositories).execute();
        assert.equal(saved.length, 2);
      });

      it("should do nothing with empty array", async () => {
        await repoRepository.saveRepositories([]);
        const saved = await db.select().from(githubRepositories).execute();
        assert.equal(saved.length, 0);
      });
    });

    describe("getRepositoriesPaginated", () => {
      it("should return paginated repositories", async () => {
        const repos: GitHubRepositoryEntity[] = Array.from({ length: 15 }, (_, i) => ({
          id: `repo-${i + 1}`,
          name: `Repository ${i + 1}`,
          description: `Description ${i + 1}`,
          stars: (i + 1) * 10,
          forks: (i + 1) * 5,
          language: i % 2 === 0 ? "TypeScript" : "JavaScript",
          url: `https://github.com/mateonunez/repo-${i + 1}`,
          fullName: `mateonunez/repo-${i + 1}`,
          private: false,
          fork: false,
          archived: false,
          disabled: false,
          visibility: "public",
          watchersCount: (i + 1) * 2,
          openIssuesCount: i + 1,
          size: (i + 1) * 100,
          defaultBranch: "main",
          topics: [`topic-${i + 1}`],
          isTemplate: false,
          hasIssues: true,
          hasProjects: true,
          hasWiki: true,
          hasPages: false,
          hasDiscussions: false,
          homepage: null,
          pushedAt: new Date(Date.now() + i * 1000),
          licenseName: "MIT",
          cloneUrl: `https://github.com/mateonunez/repo-${i + 1}.git`,
          sshUrl: `git@github.com:mateonunez/repo-${i + 1}.git`,
          ownerData: null,
          licenseData: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "repository",
        })) as unknown as GitHubRepositoryEntity[];

        await repoRepository.saveRepositories(repos);

        const result = await repoRepository.getRepositoriesPaginated({ page: 1, limit: 5 });
        assert.equal(result.data.length, 5);
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.limit, 5);
        assert.equal(result.pagination.total, 15);
        assert.equal(result.pagination.totalPages, 3);
      });

      it("should return correct page for second page", async () => {
        const repos: GitHubRepositoryEntity[] = Array.from({ length: 10 }, (_, i) => ({
          id: `repo-${i + 1}`,
          name: `Repository ${i + 1}`,
          description: `Description ${i + 1}`,
          stars: 100,
          forks: 50,
          language: "TypeScript",
          url: `https://github.com/mateonunez/repo-${i + 1}`,
          fullName: `mateonunez/repo-${i + 1}`,
          private: false,
          fork: false,
          archived: false,
          disabled: false,
          visibility: "public",
          watchersCount: 10,
          openIssuesCount: 5,
          size: 1024,
          defaultBranch: "main",
          topics: [],
          isTemplate: false,
          hasIssues: true,
          hasProjects: true,
          hasWiki: true,
          hasPages: false,
          hasDiscussions: false,
          homepage: null,
          pushedAt: new Date(Date.now() + i * 1000),
          licenseName: "MIT",
          cloneUrl: `https://github.com/mateonunez/repo-${i + 1}.git`,
          sshUrl: `git@github.com:mateonunez/repo-${i + 1}.git`,
          ownerData: null,
          licenseData: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "repository",
        })) as unknown as GitHubRepositoryEntity[];

        await repoRepository.saveRepositories(repos);

        const result = await repoRepository.getRepositoriesPaginated({ page: 2, limit: 3 });
        assert.equal(result.data.length, 3);
        assert.equal(result.pagination.page, 2);
        assert.equal(result.pagination.limit, 3);
        assert.equal(result.pagination.total, 10);
        assert.equal(result.pagination.totalPages, 4);
      });

      it("should return empty array when no repositories exist", async () => {
        const result = await repoRepository.getRepositoriesPaginated({ page: 1, limit: 10 });
        assert.equal(result.data.length, 0);
        assert.equal(result.pagination.total, 0);
        assert.equal(result.pagination.totalPages, 0);
      });
    });
  });

  describe("ConnectorGitHubPullRequestRepository", () => {
    const prRepository: ConnectorGitHubPullRequestRepository = new ConnectorGitHubPullRequestRepository();

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

  describe("ConnectorGitHubCommitRepository", () => {
    const commitRepository: ConnectorGitHubCommitRepository = new ConnectorGitHubCommitRepository();

    beforeEach(async () => {
      await db.delete(githubCommits).execute();
    });

    describe("saveCommit", () => {
      it("should save commit successfully", async () => {
        const commit: GitHubCommitEntity = {
          sha: "abc123def456",
          message: "Fix bug in authentication",
          messageBody: "This commit fixes a critical bug in the authentication flow.",
          htmlUrl: "https://github.com/mateonunez/test-repo/commit/abc123def456",
          commentsUrl: "https://api.github.com/repos/mateonunez/test-repo/commits/abc123def456/comments",
          nodeId: "MDY6Q29tbWl0YWJjMTIzZGVmNDU2",
          authorName: "John Doe",
          authorEmail: "john@example.com",
          authorDate: new Date("2024-01-15T10:30:00Z"),
          committerName: "John Doe",
          committerEmail: "john@example.com",
          committerDate: new Date("2024-01-15T10:30:00Z"),
          treeSha: "tree123",
          treeUrl: "https://api.github.com/repos/mateonunez/test-repo/git/trees/tree123",
          parentShas: ["parent123"],
          additions: 50,
          deletions: 20,
          total: 70,
          repositoryId: "repo-123",
          repositoryName: "test-repo",
          repositoryFullName: "mateonunez/test-repo",
          authorData: { login: "johndoe", id: 1 },
          committerData: { login: "johndoe", id: 1 },
          filesData: [
            { filename: "src/auth.ts", additions: 30, deletions: 10, changes: 40 },
            { filename: "src/utils.ts", additions: 20, deletions: 10, changes: 30 },
          ],
          verification: { verified: true, reason: "valid" },
          metadata: { url: "https://api.github.com/repos/mateonunez/test-repo/commits/abc123def456" },
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "commit",
        } as GitHubCommitEntity;

        await commitRepository.saveCommit(commit);

        const saved = await db
          .select()
          .from(githubCommits)
          .where(drizzleOrm.eq(githubCommits.sha, commit.sha))
          .execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].sha, commit.sha);
        assert.equal(saved[0].message, commit.message);
        assert.equal(saved[0].messageBody, commit.messageBody);
        assert.equal(saved[0].additions, commit.additions);
        assert.equal(saved[0].deletions, commit.deletions);
      });

      it("should throw on missing commit SHA", async () => {
        const commit = {} as GitHubCommitEntity;

        await assert.rejects(() => commitRepository.saveCommit(commit), {
          message: /Failed to save/,
        });
      });

      it("should update existing commit on conflict", async () => {
        const commit: GitHubCommitEntity = {
          sha: "existing-sha",
          message: "Initial commit",
          messageBody: null,
          htmlUrl: "https://github.com/mateonunez/test-repo/commit/existing-sha",
          commentsUrl: "https://api.github.com/repos/mateonunez/test-repo/commits/existing-sha/comments",
          nodeId: "MDY6Q29tbWl0ZXhpc3Rpbmctc2hh",
          authorName: "Jane Doe",
          authorEmail: "jane@example.com",
          authorDate: new Date("2024-01-10T10:00:00Z"),
          committerName: "Jane Doe",
          committerEmail: "jane@example.com",
          committerDate: new Date("2024-01-10T10:00:00Z"),
          treeSha: "tree456",
          treeUrl: "https://api.github.com/repos/mateonunez/test-repo/git/trees/tree456",
          parentShas: [],
          additions: 10,
          deletions: 5,
          total: 15,
          repositoryId: "repo-123",
          repositoryName: "test-repo",
          repositoryFullName: "mateonunez/test-repo",
          authorData: null,
          committerData: null,
          filesData: null,
          verification: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "commit",
        } as GitHubCommitEntity;

        await commitRepository.saveCommit(commit);

        // Update the commit
        const updatedCommit: GitHubCommitEntity = {
          ...commit,
          message: "Updated commit message",
          messageBody: "Updated body",
          additions: 100,
          deletions: 50,
        } as GitHubCommitEntity;

        await commitRepository.saveCommit(updatedCommit);

        const saved = await db
          .select()
          .from(githubCommits)
          .where(drizzleOrm.eq(githubCommits.sha, commit.sha))
          .execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].message, "Updated commit message");
        assert.equal(saved[0].messageBody, "Updated body");
        assert.equal(saved[0].additions, 100);
        assert.equal(saved[0].deletions, 50);
      });
    });

    describe("saveCommits", () => {
      it("should save multiple commits", async () => {
        const commits: GitHubCommitEntity[] = [
          {
            sha: "commit-1",
            message: "First commit",
            messageBody: null,
            htmlUrl: "https://github.com/mateonunez/test-repo/commit/commit-1",
            commentsUrl: "https://api.github.com/repos/mateonunez/test-repo/commits/commit-1/comments",
            nodeId: "MDY6Q29tbWl0Y29tbWl0LTE=",
            authorName: "Alice",
            authorEmail: "alice@example.com",
            authorDate: new Date("2024-01-15T10:00:00Z"),
            committerName: "Alice",
            committerEmail: "alice@example.com",
            committerDate: new Date("2024-01-15T10:00:00Z"),
            treeSha: "tree1",
            treeUrl: "https://api.github.com/repos/mateonunez/test-repo/git/trees/tree1",
            parentShas: [],
            additions: 20,
            deletions: 5,
            total: 25,
            repositoryId: "repo-123",
            repositoryName: "test-repo",
            repositoryFullName: "mateonunez/test-repo",
            authorData: null,
            committerData: null,
            filesData: null,
            verification: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            __type: "commit",
          },
          {
            sha: "commit-2",
            message: "Second commit",
            messageBody: "Added new feature",
            htmlUrl: "https://github.com/mateonunez/test-repo/commit/commit-2",
            commentsUrl: "https://api.github.com/repos/mateonunez/test-repo/commits/commit-2/comments",
            nodeId: "MDY6Q29tbWl0Y29tbWl0LTI=",
            authorName: "Bob",
            authorEmail: "bob@example.com",
            authorDate: new Date("2024-01-16T11:00:00Z"),
            committerName: "Bob",
            committerEmail: "bob@example.com",
            committerDate: new Date("2024-01-16T11:00:00Z"),
            treeSha: "tree2",
            treeUrl: "https://api.github.com/repos/mateonunez/test-repo/git/trees/tree2",
            parentShas: ["commit-1"],
            additions: 30,
            deletions: 10,
            total: 40,
            repositoryId: "repo-123",
            repositoryName: "test-repo",
            repositoryFullName: "mateonunez/test-repo",
            authorData: null,
            committerData: null,
            filesData: [{ filename: "src/feature.ts", additions: 30, deletions: 10, changes: 40 }],
            verification: { verified: false },
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            __type: "commit",
          },
        ] as GitHubCommitEntity[];

        await commitRepository.saveCommits(commits);

        const saved = await db.select().from(githubCommits).execute();
        assert.equal(saved.length, 2);
      });

      it("should do nothing with empty array", async () => {
        await commitRepository.saveCommits([]);
        const saved = await db.select().from(githubCommits).execute();
        assert.equal(saved.length, 0);
      });
    });

    describe("getCommitsPaginated", () => {
      it("should return paginated commits", async () => {
        const commits: GitHubCommitEntity[] = Array.from({ length: 15 }, (_, i) => ({
          sha: `commit-${i + 1}`,
          message: `Commit message ${i + 1}`,
          messageBody: i % 2 === 0 ? `Body for commit ${i + 1}` : null,
          htmlUrl: `https://github.com/mateonunez/test-repo/commit/commit-${i + 1}`,
          commentsUrl: `https://api.github.com/repos/mateonunez/test-repo/commits/commit-${i + 1}/comments`,
          nodeId: `MDY6Q29tbWl0Y29tbWl0LTE=${i + 1}`,
          authorName: `Author ${i + 1}`,
          authorEmail: `author${i + 1}@example.com`,
          authorDate: new Date(Date.now() - i * 86400000), // Different dates
          committerName: `Committer ${i + 1}`,
          committerEmail: `committer${i + 1}@example.com`,
          committerDate: new Date(Date.now() - i * 86400000),
          treeSha: `tree${i + 1}`,
          treeUrl: `https://api.github.com/repos/mateonunez/test-repo/git/trees/tree${i + 1}`,
          parentShas: i > 0 ? [`commit-${i}`] : [],
          additions: (i + 1) * 10,
          deletions: (i + 1) * 5,
          total: (i + 1) * 15,
          repositoryId: "repo-123",
          repositoryName: "test-repo",
          repositoryFullName: "mateonunez/test-repo",
          authorData: null,
          committerData: null,
          filesData: i % 3 === 0 ? [{ filename: `file${i}.ts`, additions: 10, deletions: 5 }] : null,
          verification: i % 2 === 0 ? { verified: true } : null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "commit",
        })) as unknown as GitHubCommitEntity[];

        await commitRepository.saveCommits(commits);

        const result = await commitRepository.getCommitsPaginated({ page: 1, limit: 5 });
        assert.equal(result.data.length, 5);
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.limit, 5);
        assert.equal(result.pagination.total, 15);
        assert.equal(result.pagination.totalPages, 3);
      });

      it("should return correct page for second page", async () => {
        const commits: GitHubCommitEntity[] = Array.from({ length: 10 }, (_, i) => ({
          sha: `commit-${i + 1}`,
          message: `Commit ${i + 1}`,
          messageBody: null,
          htmlUrl: `https://github.com/mateonunez/test-repo/commit/commit-${i + 1}`,
          commentsUrl: `https://api.github.com/repos/mateonunez/test-repo/commits/commit-${i + 1}/comments`,
          nodeId: `MDY6Q29tbWl0Y29tbWl0LTE=${i + 1}`,
          authorName: "Test Author",
          authorEmail: "test@example.com",
          authorDate: new Date(Date.now() - i * 86400000),
          committerName: "Test Committer",
          committerEmail: "test@example.com",
          committerDate: new Date(Date.now() - i * 86400000),
          treeSha: `tree${i + 1}`,
          treeUrl: `https://api.github.com/repos/mateonunez/test-repo/git/trees/tree${i + 1}`,
          parentShas: [],
          additions: 10,
          deletions: 5,
          total: 15,
          repositoryId: "repo-123",
          repositoryName: "test-repo",
          repositoryFullName: "mateonunez/test-repo",
          authorData: null,
          committerData: null,
          filesData: null,
          verification: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "commit",
        })) as unknown as GitHubCommitEntity[];

        await commitRepository.saveCommits(commits);

        const result = await commitRepository.getCommitsPaginated({ page: 2, limit: 3 });
        assert.equal(result.data.length, 3);
        assert.equal(result.pagination.page, 2);
        assert.equal(result.pagination.limit, 3);
        assert.equal(result.pagination.total, 10);
        assert.equal(result.pagination.totalPages, 4);
      });

      it("should return empty array when no commits exist", async () => {
        const result = await commitRepository.getCommitsPaginated({ page: 1, limit: 10 });
        assert.equal(result.data.length, 0);
        assert.equal(result.pagination.total, 0);
        assert.equal(result.pagination.totalPages, 0);
      });

      it("should order commits by committerDate descending", async () => {
        const commits: GitHubCommitEntity[] = [
          {
            sha: "old-commit",
            message: "Old commit",
            messageBody: null,
            htmlUrl: "https://github.com/mateonunez/test-repo/commit/old-commit",
            commentsUrl: "https://api.github.com/repos/mateonunez/test-repo/commits/old-commit/comments",
            nodeId: "MDY6Q29tbWl0b2xkLWNvbW1pdA==",
            authorName: "Author",
            authorEmail: "author@example.com",
            authorDate: new Date("2024-01-10T10:00:00Z"),
            committerName: "Committer",
            committerEmail: "committer@example.com",
            committerDate: new Date("2024-01-10T10:00:00Z"),
            treeSha: "tree-old",
            treeUrl: "https://api.github.com/repos/mateonunez/test-repo/git/trees/tree-old",
            parentShas: [],
            additions: 10,
            deletions: 5,
            total: 15,
            repositoryId: "repo-123",
            repositoryName: "test-repo",
            repositoryFullName: "mateonunez/test-repo",
            authorData: null,
            committerData: null,
            filesData: null,
            verification: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            __type: "commit",
          },
          {
            sha: "new-commit",
            message: "New commit",
            messageBody: null,
            htmlUrl: "https://github.com/mateonunez/test-repo/commit/new-commit",
            commentsUrl: "https://api.github.com/repos/mateonunez/test-repo/commits/new-commit/comments",
            nodeId: "MDY6Q29tbWl0bmV3LWNvbW1pdA==",
            authorName: "Author",
            authorEmail: "author@example.com",
            authorDate: new Date("2024-01-20T10:00:00Z"),
            committerName: "Committer",
            committerEmail: "committer@example.com",
            committerDate: new Date("2024-01-20T10:00:00Z"),
            treeSha: "tree-new",
            treeUrl: "https://api.github.com/repos/mateonunez/test-repo/git/trees/tree-new",
            parentShas: ["old-commit"],
            additions: 20,
            deletions: 10,
            total: 30,
            repositoryId: "repo-123",
            repositoryName: "test-repo",
            repositoryFullName: "mateonunez/test-repo",
            authorData: null,
            committerData: null,
            filesData: null,
            verification: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            __type: "commit",
          },
        ] as GitHubCommitEntity[];

        await commitRepository.saveCommits(commits);

        const result = await commitRepository.getCommitsPaginated({ page: 1, limit: 10 });
        assert.equal(result.data.length, 2);
        // Should be ordered by committerDate descending, so newest first
        assert(result.data[0] !== undefined);
        assert(result.data[1] !== undefined);
        assert.equal(result.data[0]!.sha, "new-commit");
        assert.equal(result.data[1]!.sha, "old-commit");
      });
    });
  });
});
