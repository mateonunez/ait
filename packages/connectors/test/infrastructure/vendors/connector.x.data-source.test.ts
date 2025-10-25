import {
  ConnectorXDataSource,
  ConnectorXDataSourceError,
} from "../../../src/infrastructure/vendors/x/connector.x.data-source";
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
          path: "/2/users/me",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, { data: { id: "user123" } });

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
      assert.equal(result.length, 1);
      assert.equal(result[0]?.id, "t1");
      assert.equal(result[0]?.__type, "tweet");
    });

    it("should handle invalid access token error", async () => {
      const mockClient = agent.get(xEndpoint);
      mockClient
        .intercept({
          path: "/2/users/me",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(401, { error: { message: "Invalid access token" } });

      await assert.rejects(
        () => dataSource.fetchTweets(),
        (error) => {
          assert.ok(error instanceof ConnectorXDataSourceError);
          assert.strictEqual(error.message, "X API error: 401 Unauthorized");
          return true;
        },
      );
    });

    it("should retry on rate limit", async () => {
      const mockClient = agent.get(xEndpoint);

      mockClient
        .intercept({
          path: "/2/users/me",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, { data: { id: "user123" } });

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
        )
        .times(1);

      mockClient
        .intercept({
          path: /^\/2\/users\/user123\/tweets/,
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, {
          data: [{ id: "t1", text: "tweet1", author_id: "user123" }],
          meta: { result_count: 1 },
        });

      const result = await dataSource.fetchTweets();
      assert.equal(result.length, 1);
      assert.equal(result[0]?.id, "t1");
    });
  });
});
