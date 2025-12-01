import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GoogleYouTubeSubscriptionExternal } from "@ait/core";
import { connectorGoogleYouTubeSubscriptionMapper } from "../../../src/domain/mappers/vendors/connector.google-youtube.mapper";

describe("Google YouTube Mappers", () => {
  describe("connectorGoogleYouTubeSubscriptionMapper", () => {
    describe("externalToDomain", () => {
      it("should map external subscription to domain entity", () => {
        const externalSubscription: GoogleYouTubeSubscriptionExternal = {
          __type: "subscription",
          kind: "youtube#subscription",
          etag: "etag",
          id: "sub-123",
          snippet: {
            publishedAt: "2024-01-01T00:00:00Z",
            channelTitle: "My Channel",
            title: "Subscribed Channel",
            description: "A great channel",
            resourceId: {
              kind: "youtube#channel",
              channelId: "channel-123",
            },
            channelId: "my-channel-id",
            thumbnails: {
              default: { url: "http://example.com/default.jpg" },
              medium: { url: "http://example.com/medium.jpg" },
              high: { url: "http://example.com/high.jpg" },
            },
          },
          contentDetails: {
            totalItemCount: 100,
            newItemCount: 5,
            activityType: "all",
          },
        };

        const domainSubscription = connectorGoogleYouTubeSubscriptionMapper.externalToDomain(externalSubscription);

        assert.equal(domainSubscription.id, "sub-123");
        assert.equal(domainSubscription.title, "Subscribed Channel");
        assert.equal(domainSubscription.description, "A great channel");
        assert.equal(domainSubscription.channelId, "my-channel-id");
        assert.equal(domainSubscription.resourceChannelId, "channel-123");
        assert.equal(domainSubscription.publishedAt, "2024-01-01T00:00:00Z");
        assert.equal(domainSubscription.thumbnailUrl, "http://example.com/high.jpg");
        assert.equal(domainSubscription.totalItemCount, 100);
        assert.equal(domainSubscription.newItemCount, 5);
        assert.equal(domainSubscription.activityType, "all");
        assert.equal(domainSubscription.__type, "subscription");
      });

      it("should handle missing optional fields", () => {
        const externalSubscription: GoogleYouTubeSubscriptionExternal = {
          __type: "subscription",
          kind: "youtube#subscription",
          etag: "etag",
          id: "sub-123",
          snippet: {
            publishedAt: "2024-01-01T00:00:00Z",
            channelTitle: "My Channel",
            title: "Subscribed Channel",
            description: "",
            resourceId: {
              kind: "youtube#channel",
              channelId: "channel-123",
            },
            channelId: "my-channel-id",
            thumbnails: {
              default: { url: "http://example.com/default.jpg" },
              medium: { url: "http://example.com/medium.jpg" },
              high: { url: "http://example.com/high.jpg" },
            },
          },
          contentDetails: {
            totalItemCount: 0,
            newItemCount: 0,
            activityType: "all",
          },
        };

        const domainSubscription = connectorGoogleYouTubeSubscriptionMapper.externalToDomain(externalSubscription);

        assert.equal(domainSubscription.description, "");
        assert.equal(domainSubscription.totalItemCount, 0);
        assert.equal(domainSubscription.newItemCount, 0);
      });
    });

    describe("domainToDataTarget", () => {
      it("should map domain subscription to data target", () => {
        const externalSubscription: GoogleYouTubeSubscriptionExternal = {
          __type: "subscription",
          kind: "youtube#subscription",
          etag: "etag",
          id: "sub-123",
          snippet: {
            publishedAt: "2024-01-01T00:00:00Z",
            channelTitle: "My Channel",
            title: "Subscribed Channel",
            description: "A great channel",
            resourceId: {
              kind: "youtube#channel",
              channelId: "channel-123",
            },
            channelId: "my-channel-id",
            thumbnails: {
              default: { url: "http://example.com/default.jpg" },
              medium: { url: "http://example.com/medium.jpg" },
              high: { url: "http://example.com/high.jpg" },
            },
          },
          contentDetails: {
            totalItemCount: 100,
            newItemCount: 5,
            activityType: "all",
          },
        };

        const domainSubscription = connectorGoogleYouTubeSubscriptionMapper.externalToDomain(externalSubscription);
        const dataTarget = connectorGoogleYouTubeSubscriptionMapper.domainToDataTarget(domainSubscription);

        assert.equal(dataTarget.id, "sub-123");
        assert.equal(dataTarget.title, "Subscribed Channel");
        assert.equal(dataTarget.description, "A great channel");
        assert.equal(dataTarget.channelId, "my-channel-id");
        assert.equal(dataTarget.resourceChannelId, "channel-123");
        assert.equal(dataTarget.totalItemCount, 100);
      });
    });
  });
});
