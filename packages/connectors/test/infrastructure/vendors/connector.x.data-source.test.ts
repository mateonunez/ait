import { ConnectorXDataSource } from "../../../src/infrastructure/vendors/x/connector.x.data-source";
import { AItError } from "@ait/core";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";

describe("ConnectorXDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorXDataSource;
  let mockAccessToken: string;
  const xEndpoint = "https://api.x.com";

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorXDataSource(mockAccessToken);
  });

  describe("fetchTweets", () => {
    it("should return a list of tweets", async () => {
      const mockClient = agent.get(xEndpoint);
      mockClient
        .intercept({
          path: "/2/users/me?user.fields=username%2Cname",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, { data: { id: "user123", username: "testuser", name: "Test User" } });

      mockClient
        .intercept({
          path: /^\/2\/users\/user123\/tweets/,
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, {
          data: [
            {
              id: "t1",
              text: "tweet1",
              author_id: "user123",
              created_at: "2025-02-09T00:00:00Z",
              public_metrics: {},
              entities: {},
              lang: "en",
            },
          ],
          meta: { result_count: 1 },
        });

      const result = await dataSource.fetchTweets();
      assert.equal(result.tweets.length, 1);
      assert.equal(result.tweets[0]?.id, "t1");
      assert.equal(result.tweets[0]?.__type, "tweet");
      assert.equal(result.tweets[0]?.username, "testuser");
      assert.equal(result.tweets[0]?.name, "Test User");
    });

    it("should handle invalid access token error", async () => {
      const mockClient = agent.get(xEndpoint);
      mockClient
        .intercept({
          path: "/2/users/me?user.fields=username%2Cname",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(401, { error: { message: "Invalid access token" } });

      await assert.rejects(
        () => dataSource.fetchTweets(),
        (error) => {
          assert.ok(error instanceof AItError);
          assert.strictEqual(error.code, "HTTP_401");
          return true;
        },
      );
    });

    it("should handle rate limit error", async () => {
      const mockClient = agent.get(xEndpoint);

      mockClient
        .intercept({
          path: "/2/users/me?user.fields=username%2Cname",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, { data: { id: "user123", username: "testuser", name: "Test User" } });

      mockClient
        .intercept({
          path: /^\/2\/users\/user123\/tweets/,
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(
          429,
          { error: { message: "Rate limit exceeded" } },
          {
            headers: { "x-rate-limit-reset": (Math.floor(Date.now() / 1000) + 1).toString() },
          },
        );

      await assert.rejects(
        () => dataSource.fetchTweets(),
        (error) => {
          assert.ok(error instanceof AItError);
          assert.strictEqual(error.code, "HTTP_429");
          return true;
        },
      );
    });
  });
});
