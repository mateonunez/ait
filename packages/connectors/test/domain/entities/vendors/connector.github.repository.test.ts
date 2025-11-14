import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm } from "@ait/postgres";
import { githubRepositories } from "@ait/postgres";
import { ConnectorGitHubRepoRepository } from "../../../../src/domain/entities/vendors/github/connector.github.repository";
import type { GitHubRepositoryEntity } from "@ait/core";

describe("ConnectorGitHubRepository", () => {
  const repoRepository: ConnectorGitHubRepoRepository = new ConnectorGitHubRepoRepository();
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorGitHubRepoRepository", () => {
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
});
