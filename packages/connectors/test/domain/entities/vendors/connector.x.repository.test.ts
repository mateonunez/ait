import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm, xTweets } from "@ait/postgres";
import type { XTweetEntity } from "../../../../src/types/domain/entities/vendors/connector.x.repository.types";
import { ConnectorXTweetRepository } from "../../../../src/domain/entities/vendors/connector.x.repository";

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
        const tweet: XTweetEntity = {
          id: "test-tweet",
          text: "Test tweet content",
          authorId: "test-author",
          likeCount: 100,
          retweetCount: 20,
          createdAt: new Date(),
          updatedAt: new Date(),
          jsonData: {},
          __type: "tweet",
        };

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
          {
            id: "tweet-1",
            text: "First tweet",
            authorId: "author-1",
            likeCount: 50,
            retweetCount: 10,
            createdAt: now,
            updatedAt: now,
            jsonData: {},
            __type: "tweet",
          },
          {
            id: "tweet-2",
            text: "Second tweet",
            authorId: "author-2",
            likeCount: 200,
            retweetCount: 40,
            createdAt: now,
            updatedAt: now,
            __type: "tweet",
            jsonData: {},
          },
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
  });
});
