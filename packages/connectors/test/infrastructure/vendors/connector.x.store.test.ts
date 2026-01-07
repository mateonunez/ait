import assert from "node:assert/strict";
// connector.x.store.test.ts
import { beforeEach, describe, it } from "node:test";
import type { XTweetEntity } from "@ait/core";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorXStore } from "../../../src/infrastructure/vendors/x/connector.x.store";
import type { IConnectorOAuthTokenResponse } from "../../../src/shared/auth/lib/oauth/connector.oauth";
import type { IConnectorXRepository } from "../../../src/types/domain/entities/vendors/connector.x.repository.types";

describe("ConnectorXStore", () => {
  let mockRepository: IConnectorXRepository;
  let store: ConnectorXStore;

  beforeEach(() => {
    mockRepository = {
      tweet: {
        saveTweet: async (_tweet: XTweetEntity) => {},
      },
      saveAuthenticationData: async (_data: IConnectorOAuthTokenResponse) => {},
      getAuthenticationData: async () => null,
    } as unknown as IConnectorXRepository;

    store = new ConnectorXStore(mockRepository);
  });

  describe("save", () => {
    it("should call saveTweet for a single tweet item", async () => {
      let savedTweet: XTweetEntity | undefined;
      // Override the tweet.saveTweet method to capture the argument.
      mockRepository.tweet.saveTweet = async (tweet: XTweetEntity) => {
        savedTweet = tweet;
      };

      const tweet: XTweetEntity = {
        id: "tweet-1",
        text: "Test tweet",
        __type: "x_tweet",
        authorId: "author-1",
        authorUsername: "user1",
        authorName: "User One",
        lang: "en",
        retweetCount: 10,
        likeCount: 50,
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
      } as unknown as any;

      await store.save(tweet);

      assert.ok(savedTweet, "Expected saveTweet to be called");
      assert.strictEqual(savedTweet, tweet);
    });

    it("should call saveTweet for multiple tweet items", async () => {
      const savedTweets: XTweetEntity[] = [];
      mockRepository.tweet.saveTweet = async (tweet: XTweetEntity) => {
        savedTweets.push(tweet);
      };

      const tweets: XTweetEntity[] = [
        {
          id: "tweet-1",
          text: "First tweet",
          __type: "x_tweet",
          authorId: "author-1",
          authorUsername: "user1",
          authorName: "User One",
          lang: "en",
          retweetCount: 10,
          likeCount: 50,
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
        } as unknown as any,
        {
          id: "tweet-2",
          text: "Second tweet",
          __type: "x_tweet",
          authorId: "author-2",
          authorUsername: "user2",
          authorName: "User Two",
          lang: "en",
          retweetCount: 20,
          likeCount: 100,
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
        } as unknown as any,
      ];

      await store.save(tweets);

      assert.equal(savedTweets.length, 2, "Expected saveTweet to be called twice");
      assert.strictEqual(savedTweets[0], tweets[0]);
      assert.strictEqual(savedTweets[1], tweets[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedEntity = {
        text: "Not supported",
        __type: "unsupported",
      } as unknown as any;

      await assert.rejects(
        async () => {
          await store.save(unsupportedEntity);
        },
        {
          message: "Type unsupported is not supported",
        },
      );
    });
  });

  describe("saveAuthenticationData", () => {
    it("should call saveAuthenticationData on the repository", async () => {
      let authDataPassed: IConnectorOAuthTokenResponse | undefined;
      mockRepository.saveAuthenticationData = async (data: IConnectorOAuthTokenResponse) => {
        authDataPassed = data;
      };

      const authData: IConnectorOAuthTokenResponse = {
        access_token: "x-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "x-refresh-token",
        scope: "read",
      };

      await store.saveAuthenticationData(authData);

      assert.ok(authDataPassed, "Expected saveAuthenticationData to be called");
      assert.deepEqual(authDataPassed, authData);
    });
  });

  describe("getAuthenticationData", () => {
    it("should return the authentication data from the repository", async () => {
      const expectedAuthData: OAuthTokenDataTarget = {
        accessToken: "x-access-token",
        tokenType: "Bearer",
        expiresIn: "3600",
        refreshToken: "x-refresh-token",
        scope: "read",
        id: "test-id",
        userId: "test-user-id",
        provider: "x",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.getAuthenticationData = async () => expectedAuthData;

      const authData = await store.getAuthenticationData();

      assert.deepEqual(authData, expectedAuthData);
    });
  });
});
