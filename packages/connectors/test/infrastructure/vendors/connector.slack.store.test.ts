import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { SlackEntity, SlackMessageEntity } from "@ait/core";
import { ConnectorSlackStore } from "../../../src/infrastructure/vendors/slack/connector.slack.store";
import type { IConnectorSlackRepository } from "../../../src/types/domain/entities/vendors/connector.slack.types";

describe("ConnectorSlackStore", () => {
  let mockRepository: IConnectorSlackRepository;
  let store: ConnectorSlackStore;

  beforeEach(() => {
    mockRepository = {
      message: {
        saveMessage: async (_message: SlackMessageEntity) => {},
      },
    } as unknown as IConnectorSlackRepository;

    store = new ConnectorSlackStore(mockRepository);
  });

  describe("save", () => {
    it("should call saveMessage for a single message item", async () => {
      let saveMessageCalledWith: SlackMessageEntity;

      mockRepository.message.saveMessage = async (message: SlackMessageEntity) => {
        saveMessageCalledWith = message;
      };

      const message: SlackMessageEntity = {
        id: "msg-1",
        channelId: "channel-1",
        channelName: "general",
        text: "Test message",
        userId: "user-1",
        userName: "Test User",
        threadTs: null,
        replyCount: 0,
        permalink: "https://testworkspace.slack.com/archives/channel-1/p1234567890",
        ts: "1234567890.123456",
        createdAt: new Date(),
        updatedAt: new Date(),
        __type: "message",
      } as unknown as SlackMessageEntity;

      await store.save(message);

      // @ts-expect-error - It's intercepted by the mock
      assert.ok(saveMessageCalledWith, "Expected saveMessage to be called");
      assert.equal(saveMessageCalledWith, message);
    });

    it("should call saveMessage for multiple message items", async () => {
      const slackMessages: SlackMessageEntity[] = [];
      mockRepository.message.saveMessage = async (message: SlackMessageEntity) => {
        slackMessages.push(message);
      };

      const messages: SlackMessageEntity[] = [
        {
          id: "msg-1",
          channelId: "channel-1",
          channelName: "general",
          text: "Message 1",
          userId: "user-1",
          userName: "User One",
          threadTs: null,
          replyCount: 0,
          permalink: "https://testworkspace.slack.com/archives/channel-1/p1234567890",
          ts: "1234567890.123456",
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "message",
        } as unknown as SlackMessageEntity,
        {
          id: "msg-2",
          channelId: "channel-2",
          channelName: "random",
          text: "Message 2",
          userId: "user-2",
          userName: "User Two",
          threadTs: null,
          replyCount: 0,
          permalink: "https://testworkspace.slack.com/archives/channel-2/p1234567891",
          ts: "1234567891.123456",
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "message",
        } as unknown as SlackMessageEntity,
      ];

      await store.save(messages);

      assert.equal(slackMessages.length, 2, "Expected saveMessage to be called twice");
      assert.equal(slackMessages[0], messages[0]);
      assert.equal(slackMessages[1], messages[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedItem = {
        id: "unsupported-1",
        name: "Some Entity",
        __type: "unsupported" as "message", // this generates a type error
      } as unknown as SlackEntity;

      await assert.rejects(async () => {
        await store.save(unsupportedItem);
      }, /Type unsupported is not supported/);
    });
  });

  describe("saveAuthenticationData", () => {
    it("should call repository saveAuthenticationData", async () => {
      let saveAuthCalled = false;
      mockRepository.saveAuthenticationData = async () => {
        saveAuthCalled = true;
      };

      await store.saveAuthenticationData({
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "test-refresh",
        scope: "read",
      });

      assert.ok(saveAuthCalled, "Expected saveAuthenticationData to be called");
    });
  });

  describe("getAuthenticationData", () => {
    it("should call repository getAuthenticationData", async () => {
      const mockAuthData = {
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      mockRepository.getAuthenticationData = async () => mockAuthData as any;

      const result = await store.getAuthenticationData();

      assert.equal(result, mockAuthData);
    });
  });
});
