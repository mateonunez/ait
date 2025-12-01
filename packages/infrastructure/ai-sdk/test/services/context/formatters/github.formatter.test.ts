import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GitHubCommitEntity, GitHubPullRequestEntity, GitHubRepositoryEntity } from "@ait/core";
import {
  GitHubCommitFormatter,
  GitHubPullRequestFormatter,
  GitHubRepositoryFormatter,
} from "../../../../src/services/context/formatters/github.formatter";

describe("GitHub Formatters", () => {
  describe("GitHubRepositoryFormatter", () => {
    it("should format repository with full stats", () => {
      const meta: GitHubRepositoryEntity = {
        __type: "repository",
        id: "repo1",
        name: "test-repo",
        fullName: "user/test-repo",
        description: "A test repository",
        language: "TypeScript",
        stars: 100,
        forks: 20,
        watchersCount: 5,
        openIssuesCount: 3,
        private: false,
        archived: false,
      } as GitHubRepositoryEntity;

      const result = GitHubRepositoryFormatter.format(meta);

      assert.ok(result.includes('Repository: "user/test-repo"'));
      assert.ok(result.includes("A test repository"));
      assert.ok(result.includes("TypeScript"));
      assert.ok(result.includes("100 stars"));
      assert.ok(result.includes("20 forks"));
    });

    it("should handle archived repositories", () => {
      const meta: GitHubRepositoryEntity = {
        __type: "repository",
        id: "repo1",
        name: "old-repo",
        archived: true,
      } as GitHubRepositoryEntity;

      const result = GitHubRepositoryFormatter.format(meta);

      assert.ok(result.includes("[archived]"));
    });
  });

  describe("GitHubPullRequestFormatter", () => {
    it("should format merged PR with stats", () => {
      const meta: GitHubPullRequestEntity = {
        __type: "pull_request",
        id: "pr1",
        number: 42,
        title: "Fix: important bug",
        state: "closed",
        merged: true,
        repositoryFullName: "user/repo",
        additions: 100,
        deletions: 50,
        changedFiles: 5,
        commits: 3,
      } as GitHubPullRequestEntity;

      const result = GitHubPullRequestFormatter.format(meta);

      assert.ok(result.includes("I merged PR #42"));
      assert.ok(result.includes("`user/repo`"));
      assert.ok(result.includes("+100/-50"));
      assert.ok(result.includes("5 files"));
      assert.ok(result.includes("3 commits"));
    });

    it("should handle draft PRs", () => {
      const meta: GitHubPullRequestEntity = {
        __type: "pull_request",
        id: "pr1",
        number: 123,
        title: "WIP: Feature",
        state: "open",
        draft: true,
      } as GitHubPullRequestEntity;

      const result = GitHubPullRequestFormatter.format(meta);

      assert.ok(result.includes("I drafted PR #123"));
    });
  });

  describe("GitHubCommitFormatter", () => {
    it("should format commit with stats", () => {
      const meta: GitHubCommitEntity = {
        __type: "commit",
        id: "commit1",
        sha: "abc123def456",
        message: "feat: add new feature",
        repositoryFullName: "user/repo",
        authorName: "John Doe",
        additions: 50,
        deletions: 10,
      } as unknown as GitHubCommitEntity;

      const result = GitHubCommitFormatter.format(meta);

      assert.ok(result.includes("I committed abc123d"));
      assert.ok(result.includes("`user/repo`"));
      assert.ok(result.includes("by John Doe"));
      assert.ok(result.includes("+50/-10"));
    });
  });
});
