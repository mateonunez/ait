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
      assert.ok(error.message.includes("Invalid fetch repositories"));
      return true;
    });
  });

  it("should throw an error if getting user fails", async () => {
    const mockReposResponse = [
      {
        id: "1",
        name: "repo1",
        full_name: "mateonunez/repo1",
        owner: { login: "mateonunez" },
        stargazers_count: 10,
      },
    ];

    agent
      .get("https://api.github.com")
      .intercept({
        path: (path) => path.startsWith("/user/repos"),
        method: "GET",
      })
      .reply(200, mockReposResponse);

    agent
      .get("https://api.github.com")
      .intercept({
        path: "/user",
        method: "GET",
      })
      .reply(401, { message: "Bad credentials" });

    await assert.rejects(dataSource.fetchRepositories(), (error: Error) => {
      assert.ok(error.message.includes("Invalid fetch repositories"));
      assert.ok(error.message.includes("Bad credentials"));
      return true;
    });
  });
});
