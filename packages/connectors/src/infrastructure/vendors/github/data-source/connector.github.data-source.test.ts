import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorGitHubDataSource } from "./connector.github.data-source";
import type { ConnectorGitHubFetchRepositoriesResponse } from "./connector.github.data-source";

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
    const mockResponse: ConnectorGitHubFetchRepositoriesResponse = [
      {
        id: 1,
        name: "repo1",
        full_name: "user/repo1",
        private: false,
      },
      {
        id: 2,
        name: "repo2",
        full_name: "user/repo2",
        private: false,
      },
    ] as unknown as ConnectorGitHubFetchRepositoriesResponse;

    agent.get("https://api.github.com").intercept({ path: "/user/repos", method: "GET" }).reply(200, mockResponse);

    const result = await dataSource.fetchRepositories();
    assert.deepEqual(result, JSON.stringify(mockResponse));
  });

  it("should throw an error if fetching repositories fails", async () => {
    agent
      .get("https://api.github.com")
      .intercept({ path: "/user/repos", method: "GET" })
      .reply(500, { message: "kaboom" });

    await assert.rejects(dataSource.fetchRepositories(), {
      message: `Invalid fetch repositories: {"message":"kaboom"}`,
    });
  });
});
