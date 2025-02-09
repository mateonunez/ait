import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type {
  GitHubEntity,
  GitHubRepositoryEntity,
  IConnectorGitHubRepository,
} from "@/types/domain/entities/vendors/connector.github.repository.types";
import { ConnectorGitHubStore } from "@/infrastructure/vendors/github/connector.github.store";

describe("ConnectorGitHubStore", () => {
  let mockRepository: IConnectorGitHubRepository;
  let store: ConnectorGitHubStore;

  beforeEach(() => {
    mockRepository = {
      repo: {
        saveRepository: async (_repo: GitHubRepositoryEntity) => {},
      },
    } as unknown as IConnectorGitHubRepository;

    store = new ConnectorGitHubStore(mockRepository);
  });

  describe("save", () => {
    it("should call saveRepository for a single repository item", async () => {
      let saveRepoCalledWith: GitHubRepositoryEntity;

      mockRepository.repo.saveRepository = async (repo: GitHubRepositoryEntity) => {
        saveRepoCalledWith = repo;
      };

      const repo: GitHubRepositoryEntity = {
        id: "repo-1",
        name: "Repository One",
        description: "A test repository",
        stars: 100,
        forks: 50,
        language: "TypeScript",
        url: "https://github.com/mateonunez/ait",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        __type: "repository",
      };

      await store.save(repo);

      // @ts-expect-error - It's intercepted by the mock
      assert.ok(saveRepoCalledWith, "Expected saveRepository to be called");
      assert.equal(saveRepoCalledWith, repo);
    });

    it("should call saveRepository for multiple repository items", async () => {
      const githubRepos: GitHubRepositoryEntity[] = [];
      mockRepository.repo.saveRepository = async (repo: GitHubRepositoryEntity) => {
        githubRepos.push(repo);
      };

      const repos: GitHubRepositoryEntity[] = [
        {
          id: "repo-1",
          name: "Repository One",
          description: "A test repository",
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
          name: "Repository Two",
          description: "Another test repository",
          stars: 200,
          forks: 100,
          language: "JavaScript",
          url: "https://github.com/mateonunez/ait",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __type: "repository",
        },
      ];

      await store.save(repos);

      assert.equal(githubRepos.length, 2, "Expected saveRepository to be called twice");
      assert.equal(githubRepos[0], repos[0]);
      assert.equal(githubRepos[1], repos[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedItem = {
        id: "unsupported-1",
        name: "Some Entity",
        __type: "unsupported" as "repository", // this generates a type error
      } as unknown as GitHubEntity;

      await assert.rejects(async () => {
        await store.save(unsupportedItem);
      }, /Type unsupported is not supported/);
    });
  });
});
