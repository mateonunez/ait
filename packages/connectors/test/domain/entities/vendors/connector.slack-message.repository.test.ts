import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm, slackMessages } from "@ait/postgres";
import { ConnectorSlackMessageRepository } from "../../../../src/domain/entities/vendors/slack/connector.slack-message.repository";
import type { SlackMessageEntity } from "@ait/core";

describe("ConnectorSlackMessageRepository", () => {
  const repository = new ConnectorSlackMessageRepository();
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorSlackMessageRepository", () => {
    beforeEach(async () => {
      await db.delete(slackMessages).execute();
    });

    describe("saveMessage", () => {
      it("should save message successfully", async () => {
        const now = new Date();
        const message: SlackMessageEntity = {
          id: "test-msg-1",
          channelId: "channel-1",
          channelName: "general",
          text: "Test message",
          userId: "user-1",
          userName: "Test User",
          threadTs: null,
          replyCount: 0,
          permalink: "https://testworkspace.slack.com/archives/channel-1/p1234567890",
          ts: "1234567890.123456",
          createdAt: now,
          updatedAt: now,
          __type: "message",
        } as unknown as SlackMessageEntity;

        await repository.saveMessage(message);

        const saved = await db
          .select()
          .from(slackMessages)
          .where(drizzleOrm.eq(slackMessages.id, message.id))
          .execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, message.id);
        assert.equal(saved[0].text, message.text);
        assert.equal(saved[0].channelId, message.channelId);
        assert.equal(saved[0].channelName, message.channelName);
      });

      it("should update existing message on conflict", async () => {
        const now = new Date();
        const message: SlackMessageEntity = {
          id: "test-msg-update",
          channelId: "channel-1",
          channelName: "general",
          text: "Original message",
          userId: "user-1",
          userName: "Test User",
          threadTs: null,
          replyCount: 0,
          permalink: "https://testworkspace.slack.com/archives/channel-1/p1234567890",
          ts: "1234567890.123456",
          createdAt: now,
          updatedAt: now,
          __type: "message",
        } as unknown as SlackMessageEntity;

        await repository.saveMessage(message);

        // Update the message
        const updatedMessage: SlackMessageEntity = {
          ...message,
          text: "Updated message",
          replyCount: 2,
          updatedAt: new Date(),
        } as unknown as SlackMessageEntity;

        await repository.saveMessage(updatedMessage);

        const saved = await db
          .select()
          .from(slackMessages)
          .where(drizzleOrm.eq(slackMessages.id, message.id))
          .execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].text, "Updated message");
        assert.equal(saved[0].replyCount, 2);
      });

      it("should throw on missing message ID", async () => {
        const message = {} as SlackMessageEntity;

        await assert.rejects(() => repository.saveMessage(message), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveMessages", () => {
      it("should save multiple messages", async () => {
        const now = new Date();
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
            createdAt: now,
            updatedAt: now,
            __type: "message",
          },
          {
            id: "msg-2",
            channelId: "channel-2",
            channelName: "random",
            text: "Message 2",
            userId: "user-2",
            userName: "User Two",
            threadTs: "1234567890.123456",
            replyCount: 3,
            permalink: "https://testworkspace.slack.com/archives/channel-2/p1234567891",
            ts: "1234567891.123456",
            createdAt: now,
            updatedAt: now,
            __type: "message",
          },
        ] as SlackMessageEntity[];

        await repository.saveMessages(messages);

        const saved = await db.select().from(slackMessages).execute();
        assert.equal(saved.length, 2, "Expected two messages to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await repository.saveMessages([]);
        const saved = await db.select().from(slackMessages).execute();
        assert.equal(saved.length, 0, "No messages should be saved for empty input");
      });
    });
  });
});
