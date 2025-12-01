import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorGoogleYouTubeDataSource } from "../../../src/infrastructure/vendors/google/connector.google-youtube.data-source";

describe("ConnectorGoogleYouTubeDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorGoogleYouTubeDataSource;
  let mockAccessToken: string;
  const googleEndpoint = "https://www.googleapis.com";

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorGoogleYouTubeDataSource(mockAccessToken);
  });

  describe("fetchSubscriptions", () => {
    it("should return a list of subscriptions", async () => {
      const mockSubscriptionsResponse = {
        kind: "youtube#SubscriptionListResponse",
        etag: "etag",
        items: [
          {
            kind: "youtube#subscription",
            etag: "etag",
            id: "sub-1",
            snippet: {
              publishedAt: "2024-01-01T00:00:00Z",
              title: "Channel Title",
              description: "Channel Description",
              resourceId: {
                kind: "youtube#channel",
                channelId: "channel-1",
              },
              channelId: "my-channel-id",
              thumbnails: {
                default: { url: "http://example.com/thumb.jpg" },
                medium: { url: "http://example.com/thumb-medium.jpg" },
                high: { url: "http://example.com/thumb-high.jpg" },
              },
              channelTitle: "Channel Title",
            },
            contentDetails: {
              totalItemCount: 10,
              newItemCount: 2,
              activityType: "all",
            },
          },
        ],
      };

      const mockClient = agent.get(googleEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/youtube/v3/subscriptions"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
        .reply(200, mockSubscriptionsResponse);

      const result = await dataSource.fetchSubscriptions();

      assert.equal(result.items.length, 1);
      assert.equal(result.items[0]?.__type, "subscription");
      assert.equal(result.items[0]?.id, "sub-1");
      assert.equal(result.items[0]?.snippet.title, "Channel Title");
      assert.equal(result.items[0]?.snippet.resourceId.channelId, "channel-1");
      assert.equal(result.items[0]?.contentDetails.totalItemCount, 10);
    });

    it("should handle pagination with nextPageToken", async () => {
      const mockPage1 = {
        kind: "youtube#SubscriptionListResponse",
        items: [
          {
            kind: "youtube#subscription",
            id: "sub-1",
            snippet: {
              publishedAt: "2024-01-01T00:00:00Z",
              title: "Channel 1",
              description: "Desc 1",
              resourceId: { kind: "youtube#channel", channelId: "channel-1" },
              channelId: "my-channel-id",
              thumbnails: { default: { url: "url" } },
              channelTitle: "Channel 1",
            },
            contentDetails: { totalItemCount: 1, newItemCount: 0, activityType: "all" },
          },
        ],
        nextPageToken: "token-123",
      };

      const mockPage2 = {
        kind: "youtube#SubscriptionListResponse",
        items: [
          {
            kind: "youtube#subscription",
            id: "sub-2",
            snippet: {
              publishedAt: "2024-01-02T00:00:00Z",
              title: "Channel 2",
              description: "Desc 2",
              resourceId: { kind: "youtube#channel", channelId: "channel-2" },
              channelId: "my-channel-id",
              thumbnails: { default: { url: "url" } },
              channelTitle: "Channel 2",
            },
            contentDetails: { totalItemCount: 2, newItemCount: 0, activityType: "all" },
          },
        ],
      };

      const mockClient = agent.get(googleEndpoint);

      // First page
      mockClient
        .intercept({
          path: (path) => path.startsWith("/youtube/v3/subscriptions") && !path.includes("pageToken"),
          method: "GET",
        })
        .reply(200, mockPage1);

      // Second page
      mockClient
        .intercept({
          path: (path) => path.startsWith("/youtube/v3/subscriptions") && path.includes("pageToken=token-123"),
          method: "GET",
        })
        .reply(200, mockPage2);

      const result1 = await dataSource.fetchSubscriptions();
      assert.equal(result1.items.length, 1);
      assert.equal(result1.nextPageToken, "token-123");

      const result2 = await dataSource.fetchSubscriptions("token-123");
      assert.equal(result2.items.length, 1);
      assert.equal(result2.nextPageToken, undefined);
    });

    it("should handle empty list", async () => {
      const mockResponse = {
        kind: "youtube#SubscriptionListResponse",
        items: [],
      };

      const mockClient = agent.get(googleEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/youtube/v3/subscriptions"),
          method: "GET",
        })
        .reply(200, mockResponse);

      const result = await dataSource.fetchSubscriptions();

      assert.equal(result.items.length, 0);
      assert.equal(result.nextPageToken, undefined);
    });

    it("should handle rate limiting (429)", async () => {
      const mockClient = agent.get(googleEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/youtube/v3/subscriptions"),
          method: "GET",
        })
        .reply(429, { error: { code: 429, message: "Rate Limit Exceeded" } });

      await assert.rejects(
        () => dataSource.fetchSubscriptions(),
        (error) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes("rate limit") || error.name === "RateLimitError");
          return true;
        },
      );
    });
  });
});
