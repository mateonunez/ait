import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import { XTweetEntity } from "@ait/core";
import { closePostgresConnection, drizzleOrm, getPostgresClient, xTweets } from "@ait/postgres";
import { ConnectorXTweetRepository } from "../../../../src/domain/entities/vendors/x/connector.x.repository";

describe("ConnectorXRepository", () => {
  const repository = new ConnectorXTweetRepository();
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorXTweetRepository", () => {
    beforeEach(async () => {
      await db.delete(xTweets).execute();
    });

    describe("saveTweet", () => {
      it("should save tweet successfully", async () => {
        const tweet = XTweetEntity.fromPlain({
          id: "test-tweet",
          text: "Test tweet content",
          authorId: "test-author",
          authorUsername: "testuser",
          authorName: "Test User",
          lang: "en",
          likeCount: 100,
          retweetCount: 20,
          replyCount: 0,
          quoteCount: 0,
          conversationId: null,
          inReplyToUserId: null,
          mediaAttachments: [],
          pollData: null,
          placeData: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          jsonData: {},
          __type: "x_tweet",
        });

        await repository.saveTweet(tweet);

        const saved = await db.select().from(xTweets).where(drizzleOrm.eq(xTweets.id, tweet.id)).execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, tweet.id);
        assert.equal(saved[0].text, tweet.text);
      });

      it("should throw on missing tweet ID", async () => {
        const tweet = {} as XTweetEntity;
        await assert.rejects(() => repository.saveTweet(tweet), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveTweets", () => {
      it("should save multiple tweets", async () => {
        const now = new Date();
        const tweets: XTweetEntity[] = [
          XTweetEntity.fromPlain({
            id: "tweet-1",
            text: "First tweet",
            authorId: "author-1",
            authorUsername: "user1",
            authorName: "User One",
            lang: "en",
            likeCount: 50,
            retweetCount: 10,
            replyCount: 0,
            quoteCount: 0,
            conversationId: null,
            inReplyToUserId: null,
            mediaAttachments: [],
            pollData: null,
            placeData: null,
            createdAt: now,
            updatedAt: now,
            jsonData: {},
            __type: "x_tweet",
          }),
          XTweetEntity.fromPlain({
            id: "tweet-2",
            text: "Second tweet",
            authorId: "author-2",
            authorUsername: "user2",
            authorName: "User Two",
            lang: "en",
            likeCount: 200,
            retweetCount: 40,
            replyCount: 0,
            quoteCount: 0,
            conversationId: null,
            inReplyToUserId: null,
            mediaAttachments: [],
            pollData: null,
            placeData: null,
            createdAt: now,
            updatedAt: now,
            __type: "x_tweet",
            jsonData: {},
          }),
        ];

        await repository.saveTweets(tweets);

        const saved = await db.select().from(xTweets).execute();
        assert.equal(saved.length, 2, "Expected two tweets to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await repository.saveTweets([]);
        const saved = await db.select().from(xTweets).execute();
        assert.equal(saved.length, 0, "No tweets should be saved for empty input");
      });
    });

    describe("getTweetsPaginated", () => {
      it("should return paginated tweets", async () => {
        const now = new Date();
        const tweets = Array.from({ length: 15 }, (_, i) =>
          XTweetEntity.fromPlain({
            id: `tweet-${i + 1}`,
            text: `Tweet ${i + 1}`,
            authorId: `author-${(i % 2) + 1}`,
            authorUsername: `user${(i % 2) + 1}`,
            authorName: `User ${(i % 2) + 1}`,
            lang: "en",
            likeCount: i * 10,
            retweetCount: i * 2,
            replyCount: 0,
            quoteCount: 0,
            conversationId: null,
            inReplyToUserId: null,
            mediaAttachments: [],
            pollData: null,
            placeData: null,
            createdAt: new Date(now.getTime() + i * 1000),
            updatedAt: new Date(now.getTime() + i * 1000),
            jsonData: {},
            __type: "x_tweet",
          }),
        );

        await repository.saveTweets(tweets);

        const result = await repository.getTweetsPaginated({ page: 1, limit: 5 });
        assert.equal(result.data.length, 5);
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.limit, 5);
        assert.equal(result.pagination.total, 15);
        assert.equal(result.pagination.totalPages, 3);
      });

      it("should return correct page for second page", async () => {
        const now = new Date();
        const tweets = Array.from({ length: 10 }, (_, i) =>
          XTweetEntity.fromPlain({
            id: `tweet-${i + 1}`,
            text: `Tweet ${i + 1}`,
            authorId: "author-1",
            authorUsername: "user1",
            authorName: "User One",
            lang: "en",
            likeCount: 50,
            retweetCount: 10,
            replyCount: 0,
            quoteCount: 0,
            conversationId: null,
            inReplyToUserId: null,
            mediaAttachments: [],
            pollData: null,
            placeData: null,
            createdAt: new Date(now.getTime() + i * 1000),
            updatedAt: new Date(now.getTime() + i * 1000),
            jsonData: {},
            __type: "x_tweet",
          }),
        );

        await repository.saveTweets(tweets);

        const result = await repository.getTweetsPaginated({ page: 2, limit: 3 });
        assert.equal(result.data.length, 3);
        assert.equal(result.pagination.page, 2);
        assert.equal(result.pagination.limit, 3);
        assert.equal(result.pagination.total, 10);
        assert.equal(result.pagination.totalPages, 4);
      });

      it("should return empty array when no tweets exist", async () => {
        const result = await repository.getTweetsPaginated({ page: 1, limit: 10 });
        assert.equal(result.data.length, 0);
        assert.equal(result.pagination.total, 0);
        assert.equal(result.pagination.totalPages, 0);
      });
    });
  });
});
