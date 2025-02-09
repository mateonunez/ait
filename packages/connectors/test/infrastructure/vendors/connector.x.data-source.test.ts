import { ConnectorXDataSource, ConnectorXDataSourceError } from "@/infrastructure/vendors/x/connector.x.data-source";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";

describe("ConnectorXDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorXDataSource;
  let mockAccessToken: string;

  beforeEach(() => {
    agent = new MockAgent();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorXDataSource(mockAccessToken);
  });

  describe("fetchTweets", () => {
    it("should return a list of tweets", async () => {
      agent
        .get("https://api.x.com")
        .intercept({
          path: "/2/users/me",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, { data: { id: "user123" } });

      const params = new URLSearchParams({
        "tweet.fields": "author_id,created_at,id,text,public_metrics,entities,lang",
        max_results: "5",
      });
      const tweetEndpoint = `/users/user123/tweets?${params.toString()}`;
      const apiTweetResponse = {
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
          {
            id: "t2",
            text: "tweet2",
            author_id: "user123",
            created_at: "2025-02-09T01:00:00Z",
            public_metrics: {},
            entities: {},
            lang: "en",
          },
        ],
        meta: { result_count: 2 },
      };

      agent
        .get("https://api.x.com")
        .intercept({
          path: `/2${tweetEndpoint}`,
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, apiTweetResponse);

      const result = await dataSource.fetchTweets();

      const expected = apiTweetResponse.data.map((tweet) => ({ ...tweet, __type: "tweet" }));
      assert.deepEqual(result, expected);
    });

    it("should handle invalid access token error when fetching user id", async () => {
      agent
        .get("https://api.x.com")
        .intercept({
          path: "/2/users/me",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(401, { error: { message: "Invalid access token" } });

      await assert.rejects(
        async () => {
          await dataSource.fetchTweets();
        },
        (error: unknown) => {
          assert.ok(error instanceof ConnectorXDataSourceError);
          assert.strictEqual(error.message, "X API error: 401 Unauthorized");
          assert.strictEqual(error.responseBody, JSON.stringify({ error: { message: "Invalid access token" } }));
          return true;
        },
      );
    });

    it("should retry the request when rate limit is exceeded", async () => {
      agent
        .get("https://api.x.com")
        .intercept({
          path: "/2/users/me",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, { data: { id: "user123" } });

      const params = new URLSearchParams({
        "tweet.fields": "author_id,created_at,id,text,public_metrics,entities,lang",
        max_results: "5",
      });
      const tweetEndpoint = `/users/user123/tweets?${params.toString()}`;
      const resetTime = Math.floor(Date.now() / 1000) + 1;

      agent
        .get("https://api.x.com")
        .intercept({
          path: `/2${tweetEndpoint}`,
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(
          429,
          { error: { message: "Rate limit exceeded" } },
          { headers: { "x-rate-limit-reset": resetTime.toString() } },
        );

      const apiTweetResponse = {
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
      };
      agent
        .get("https://api.x.com")
        .intercept({
          path: `/2${tweetEndpoint}`,
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, apiTweetResponse);

      const result = await dataSource.fetchTweets();
      const expected = apiTweetResponse.data.map((tweet) => ({ ...tweet, __type: "tweet" }));
      assert.deepEqual(result, expected);
    });
  });
});
