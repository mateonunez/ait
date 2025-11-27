import {
  ConnectorGitHubDataSource,
  type ConnectorGitHubFetchRepositoriesResponse,
} from "../../../src/infrastructure/vendors/github/connector.github.data-source";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";

describe("ConnectorGitHubDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorGitHubDataSource;
  let mockAccessToken: string;

  beforeEach(() => {
    agent = new MockAgent();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorGitHubDataSource(mockAccessToken);
  });

  it("should instantiate correctly", () => {
    assert.ok(dataSource);
  });

  it("should return a list of repositories", async () => {
    const mockUserResponse = {
      login: "mateonunez",
      id: 123456,
      avatar_url: "https://avatars.githubusercontent.com/u/123456",
    };

    const mockResponse: ConnectorGitHubFetchRepositoriesResponse = [
      {
        id: "1",
        name: "repo1",
        full_name: "mateonunez/repo1",
        private: false,
        owner: { login: "mateonunez" },
        stargazers_count: 10,
        __type: "repository",
      },
      {
        id: "2",
        name: "repo2",
        full_name: "other/repo2",
        private: false,
        owner: { login: "other" },
        stargazers_count: 5,
        __type: "repository",
      },
    ] as unknown as ConnectorGitHubFetchRepositoriesResponse;

    agent
      .get("https://api.github.com")
      .intercept({
        path: (path) => path.startsWith("/user/repos"),
        method: "GET",
      })
      .reply(200, mockResponse);

    agent
      .get("https://api.github.com")
      .intercept({
        path: "/user",
        method: "GET",
      })
      .reply(200, mockUserResponse);

    const result = await dataSource.fetchRepositories();

    assert.equal(result.length, 2);
    assert.equal(result[0]?.name, "repo1");
    assert.equal(result[1]?.name, "repo2");
  });

  it("should throw an error if fetching repositories fails", async () => {
    agent
      .get("https://api.github.com")
      .intercept({
        path: (path) => path.startsWith("/user/repos"),
        method: "GET",
      })
      .reply(500, { message: "kaboom" });

    await assert.rejects(dataSource.fetchRepositories(), (error: Error) => {
      assert.ok(error.message.includes("GITHUB_FETCH_REPOS"));
      return true;
    });
  });

  it("should handle authentication errors", async () => {
    agent
      .get("https://api.github.com")
      .intercept({
        path: (path) => path.startsWith("/user/repos"),
        method: "GET",
      })
      .reply(401, { message: "Bad credentials" });

    await assert.rejects(dataSource.fetchRepositories(), (error: Error) => {
      assert.ok(error.message.includes("GITHUB_FETCH_REPOS"));
      assert.ok(error.message.includes("Bad credentials"));
      return true;
    });
  });

  describe("Pull Requests", () => {
    it("should fetch pull requests from all repositories", async () => {
      const mockReposResponse = [
        {
          id: 123,
          name: "test-repo",
          full_name: "mateonunez/test-repo",
          owner: { login: "mateonunez" },
          stargazers_count: 10,
        },
      ];

      const mockPullRequestsResponse = [
        {
          id: 1,
          number: 1,
          title: "Test PR 1",
          body: "This is test PR 1",
          state: "open",
          draft: false,
          locked: false,
          html_url: "https://github.com/mateonunez/test-repo/pull/1",
          diff_url: "https://github.com/mateonunez/test-repo/pull/1.diff",
          patch_url: "https://github.com/mateonunez/test-repo/pull/1.patch",
          issue_url: "https://api.github.com/repos/mateonunez/test-repo/issues/1",
          merged: false,
          merged_at: null,
          closed_at: null,
          merge_commit_sha: null,
          commits: 3,
          additions: 100,
          deletions: 10,
          changed_files: 5,
          comments: 2,
          review_comments: 1,
          head: {
            ref: "feature-branch",
            sha: "abc123",
          },
          base: {
            ref: "main",
            sha: "def456",
            repo: { id: 123 },
          },
          mergeable: true,
          maintainer_can_modify: true,
          user: { login: "testuser", id: 12345 },
          assignee: null,
          assignees: [],
          requested_reviewers: [],
          merged_by: null,
          labels: [{ name: "feature", color: "00ff00" }],
          milestone: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock repos endpoint (fetchPullRequests calls fetchRepositories internally)
      agent
        .get("https://api.github.com")
        .intercept({
          path: (path) => path.startsWith("/user/repos"),
          method: "GET",
        })
        .reply(200, mockReposResponse);

      // Mock pulls endpoint for each repo (Octokit expects { data: [...] } format from response.data)
      agent
        .get("https://api.github.com")
        .intercept({
          path: (path) => path.includes("/repos/mateonunez/test-repo/pulls"),
          method: "GET",
        })
        .reply(200, mockPullRequestsResponse, {
          headers: {
            "content-type": "application/json",
          },
        });

      const result = await dataSource.fetchPullRequests();

      assert.ok(Array.isArray(result));
      assert.equal(result.length, 1);
      assert.equal(result[0]?.__type, "pull_request");
      assert.equal(result[0]?.number, 1);
      assert.equal(result[0]?.title, "Test PR 1");
    });

    it("should handle errors when fetching pull requests", async () => {
      agent
        .get("https://api.github.com")
        .intercept({
          path: (path) => path.startsWith("/user/repos"),
          method: "GET",
        })
        .reply(500, { message: "API Error" });

      await assert.rejects(dataSource.fetchPullRequests(), (error: Error) => {
        assert.ok(error.message.includes("GITHUB_FETCH_PRS"));
        return true;
      });
    });

    it("should continue when individual repository PR fetch fails", async () => {
      const mockReposResponse = [
        {
          id: 123,
          name: "test-repo-1",
          full_name: "mateonunez/test-repo-1",
          owner: { login: "mateonunez" },
        },
        {
          id: 456,
          name: "test-repo-2",
          full_name: "mateonunez/test-repo-2",
          owner: { login: "mateonunez" },
        },
      ];

      // Mock repos endpoint
      agent
        .get("https://api.github.com")
        .intercept({
          path: (path) => path.startsWith("/user/repos"),
          method: "GET",
        })
        .reply(200, mockReposResponse);

      // Mock first repo pulls to fail
      agent
        .get("https://api.github.com")
        .intercept({
          path: (path) => path.includes("/repos/mateonunez/test-repo-1/pulls"),
          method: "GET",
        })
        .reply(500, { message: "Failed to fetch PRs" });

      // Mock second repo pulls to succeed with empty array
      agent
        .get("https://api.github.com")
        .intercept({
          path: (path) => path.includes("/repos/mateonunez/test-repo-2/pulls"),
          method: "GET",
        })
        .reply(200, [], {
          headers: {
            "content-type": "application/json",
          },
        });

      const result = await dataSource.fetchPullRequests();

      assert.ok(Array.isArray(result));
      // Should still succeed for repo 2 even though repo 1 failed
      assert.equal(result.length, 0);
    });
  });
});
