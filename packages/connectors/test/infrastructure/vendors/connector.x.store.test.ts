// connector.x.store.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type {
  IConnectorXRepository,
  XEntity,
  XTweetEntity,
} from "@/types/domain/entities/vendors/connector.x.repository.types";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { ConnectorXStore } from "@/infrastructure/vendors/x/connector.x.store";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { X_ENTITY_TYPES_ENUM } from "@/services/vendors/connector.vendors.config";

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
        text: "Hello, world!",
        __type: X_ENTITY_TYPES_ENUM.TWEET,
        authorId: "user123",
        createdAt: new Date(),
        updatedAt: new Date(),
        jsonData: {},
      };

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
          text: "Hello, world!",
          __type: "tweet",
          authorId: "user1",
          createdAt: new Date(),
          updatedAt: new Date(),
          jsonData: {},
        },
        {
          id: "tweet-2",
          text: "Another tweet",
          __type: "tweet",
          authorId: "user2",
          createdAt: new Date(),
          updatedAt: new Date(),
          jsonData: {},
        },
      ];

      await store.save(tweets);

      assert.equal(savedTweets.length, 2, "Expected saveTweet to be called twice");
      assert.strictEqual(savedTweets[0], tweets[0]);
      assert.strictEqual(savedTweets[1], tweets[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedEntity = {
        id: "unsupported-1",
        text: "Not supported",
        __type: "unsupported",
      } as unknown as XEntity;

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
      };

      mockRepository.getAuthenticationData = async () => expectedAuthData;

      const authData = await store.getAuthenticationData();

      assert.deepEqual(authData, expectedAuthData);
    });
  });
});
