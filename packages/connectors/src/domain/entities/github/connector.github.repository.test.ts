import { describe, it, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { db, dbClose, orm } from "@ait/database";
import { ConnectorGitHubRepository, ConnectorGitHubRepositoryRepository } from "./connector.github.repository";
import type { GitHubRepositoryEntity } from "./connector.github.entities";
import { githubRepositories } from "@ait/database";

describe("ConnectorGitHubRepository", () => {
  let repository: ConnectorGitHubRepository;
  let repoRepository: ConnectorGitHubRepositoryRepository;

  beforeEach(async () => {
    // Clean up existing data
    await db.delete(githubRepositories).execute();

    repoRepository = new ConnectorGitHubRepositoryRepository();
    repository = new ConnectorGitHubRepository();
  });

  after(async () => {
    await dbClose();
  });

  describe("ConnectorGitHubRepositoryRepository", () => {
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
          type: "repository",
        };

        await repoRepository.saveRepository(repo);

        const saved = await db.select().from(githubRepositories).where(orm.eq(githubRepositories.id, repo.id)).execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, repo.id);
      });

      it("should throw on missing repository ID", async () => {
        const repo = {} as GitHubRepositoryEntity;

        await assert.rejects(() => repoRepository.saveRepository(repo), {
          message: "Invalid repository: missing repository ID",
        });
      });
    });

    describe("saveRepositories", () => {
      it("should save multiple repositories", async () => {
        const repos: GitHubRepositoryEntity[] = [
          {
            id: "test-1",
            name: "Repository 1",
            description: "Description 1",
            stars: 100,
            forks: 50,
            language: "TypeScript",
            url: "https://github.com/mateonunez/ait",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            type: "repository",
          },
          {
            id: "test-2",
            name: "Repository 2",
            description: "Description 2",
            stars: 200,
            forks: 100,
            language: "JavaScript",
            url: "https://github.com/mateonunez/ait",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            type: "repository",
          },
        ];

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
