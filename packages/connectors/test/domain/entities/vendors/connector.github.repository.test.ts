import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm } from "@ait/postgres";
import { githubRepositories } from "@ait/postgres";
import { ConnectorGitHubRepoRepository } from "../../../../src/domain/entities/vendors/connector.github.repository";
import type { GitHubRepositoryEntity } from "../../../../src/types/domain/entities/vendors/connector.github.repository.types";

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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __type: "repository",
        } as GitHubRepositoryEntity;

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
            url: "https://github.com/mateonunez/ait",
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
            url: "https://github.com/mateonunez/ait",
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
  });
});
