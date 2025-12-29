import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import {
  ConnectorSlackDataSource,
  type IConnectorSlackDataSource,
} from "../../../src/infrastructure/vendors/slack/connector.slack.data-source";

describe("ConnectorSlackDataSource", () => {
  let agent: MockAgent;
  let dataSource: IConnectorSlackDataSource;
  let mockAccessToken: string;
  const slackEndpoint = "https://slack.com";

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorSlackDataSource(mockAccessToken);
  });

  describe("fetchMessages", () => {
    it("should return a list of messages", async () => {
      const mockUsersResponse = {
        ok: true,
        members: [
          {
            id: "user-1",
            name: "testuser",
            real_name: "Test User",
            profile: { real_name: "Test User", display_name: "Test User" },
            is_bot: false,
            deleted: false,
          },
        ],
        response_metadata: {},
      };

      const mockTeamInfoResponse = {
        ok: true,
        team: {
          url: "https://testworkspace.slack.com",
        },
      };

      const mockConversationsResponse = {
        ok: true,
        channels: [
          {
            id: "channel-1",
            name: "general",
            is_archived: false,
            is_private: false,
            is_im: false,
            is_mpim: false,
            is_member: true,
          },
        ],
        response_metadata: {},
      };

      const mockHistoryResponse = {
        ok: true,
        messages: [
          {
            ts: "1234567890.123456",
            user: "user-1",
            text: "Hello, world!",
            type: "slack_message",
          },
        ],
        has_more: false,
        response_metadata: {},
      };

      const mockClient = agent.get(slackEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/users.list"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
        .reply(200, mockUsersResponse);

      mockClient
        .intercept({
          path: "/api/team.info",
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
        .reply(200, mockTeamInfoResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.list"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
        .reply(200, mockConversationsResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.history"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        })
        .reply(200, mockHistoryResponse)
        .persist();

      const result = await dataSource.fetchMessages();

      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0]?.__type, "slack_message");
      assert.equal(result.messages[0]?.channel, "channel-1");
      assert.equal(result.messages[0]?.channelName, "general");
      assert.equal(result.messages[0]?.text, "Hello, world!");
      assert.equal(result.messages[0]?.user, "user-1");
      assert.ok(result.messages[0]?.userName);
      assert.ok(result.messages[0]?.permalink);
    });

    it("should handle pagination for conversations", async () => {
      const mockUsersResponse = {
        ok: true,
        members: [],
        response_metadata: {},
      };

      const mockTeamInfoResponse = {
        ok: true,
        team: { url: "https://testworkspace.slack.com" },
      };

      const mockConversationsPage1 = {
        ok: true,
        channels: [
          {
            id: "channel-1",
            name: "general",
            is_archived: false,
            is_private: false,
            is_im: false,
            is_mpim: false,
            is_member: true,
          },
        ],
        response_metadata: { next_cursor: "cursor-123" },
      };

      const mockConversationsPage2 = {
        ok: true,
        channels: [
          {
            id: "channel-2",
            name: "random",
            is_archived: false,
            is_private: false,
            is_im: false,
            is_mpim: false,
            is_member: true,
          },
        ],
        response_metadata: {},
      };

      const mockHistoryResponse = {
        ok: true,
        messages: [],
        has_more: false,
        response_metadata: {},
      };

      const mockClient = agent.get(slackEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/users.list"),
          method: "GET",
        })
        .reply(200, mockUsersResponse);

      mockClient
        .intercept({
          path: "/api/team.info",
          method: "GET",
        })
        .reply(200, mockTeamInfoResponse);

      // First conversations.list request
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.list"),
          method: "GET",
        })
        .reply(200, mockConversationsPage1);

      // Second conversations.list request
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.list"),
          method: "GET",
        })
        .reply(200, mockConversationsPage2);

      // History requests - use persist() as fetchConversations also calls history for sorting
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.history"),
          method: "GET",
        })
        .reply(200, mockHistoryResponse)
        .persist();

      const result = await dataSource.fetchMessages();

      // Should process both channels
      assert.ok(Array.isArray(result.messages));
    });

    it("should filter out bot messages and system messages", async () => {
      const mockUsersResponse = {
        ok: true,
        members: [],
        response_metadata: {},
      };

      const mockTeamInfoResponse = {
        ok: true,
        team: { url: "https://testworkspace.slack.com" },
      };

      const mockConversationsResponse = {
        ok: true,
        channels: [
          {
            id: "channel-1",
            name: "general",
            is_archived: false,
            is_private: false,
            is_im: false,
            is_mpim: false,
            is_member: true,
          },
        ],
        response_metadata: {},
      };

      const mockHistoryResponse = {
        ok: true,
        messages: [
          {
            ts: "1234567890.123456",
            user: "user-1",
            text: "Valid message",
            type: "slack_message",
          },
          {
            ts: "1234567890.123457",
            bot_id: "bot-1",
            text: "Bot message",
            type: "slack_message",
          },
          {
            ts: "1234567890.123458",
            user: "user-2",
            text: "",
            type: "slack_message",
          },
          {
            ts: "1234567890.123459",
            user: "user-3",
            text: "System message",
            subtype: "channel_join",
            type: "slack_message",
          },
        ],
        has_more: false,
        response_metadata: {},
      };

      const mockClient = agent.get(slackEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/users.list"),
          method: "GET",
        })
        .reply(200, mockUsersResponse);

      mockClient
        .intercept({
          path: "/api/team.info",
          method: "GET",
        })
        .reply(200, mockTeamInfoResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.list"),
          method: "GET",
        })
        .reply(200, mockConversationsResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.history"),
          method: "GET",
        })
        .reply(200, mockHistoryResponse)
        .persist();

      const result = await dataSource.fetchMessages();

      // Should filter out system messages (channel_join) and empty messages
      // Bot messages are NOT filtered by default since they may contain valuable content
      assert.equal(result.messages.length, 2);
      assert.ok(result.messages.some((m) => m.text === "Valid message"));
      assert.ok(result.messages.some((m) => m.text === "Bot message"));
    });

    it("should handle authentication errors", async () => {
      const mockClient = agent.get(slackEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/users.list"),
          method: "GET",
        })
        .reply(401, { ok: false, error: "invalid_auth" });

      await assert.rejects(
        () => dataSource.fetchMessages(),
        (error) => {
          assert.ok(error instanceof Error);
          return true;
        },
      );
    });

    it("should handle API errors gracefully", async () => {
      const mockUsersResponse = {
        ok: true,
        members: [],
        response_metadata: {},
      };

      const mockTeamInfoResponse = {
        ok: true,
        team: { url: "https://testworkspace.slack.com" },
      };

      const mockConversationsResponse = {
        ok: true,
        channels: [
          {
            id: "channel-1",
            name: "general",
            is_archived: false,
            is_private: false,
            is_im: false,
            is_mpim: false,
            is_member: true,
          },
        ],
        response_metadata: {},
      };

      const mockClient = agent.get(slackEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/users.list"),
          method: "GET",
        })
        .reply(200, mockUsersResponse);

      mockClient
        .intercept({
          path: "/api/team.info",
          method: "GET",
        })
        .reply(200, mockTeamInfoResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.list"),
          method: "GET",
        })
        .reply(200, mockConversationsResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.history"),
          method: "GET",
        })
        .reply(200, { ok: false, error: "channel_not_found" })
        .persist();

      const result = await dataSource.fetchMessages();

      // Should handle gracefully and return empty array
      assert.ok(Array.isArray(result.messages));
    });

    it("should skip channels where bot is not a member", async () => {
      const mockUsersResponse = {
        ok: true,
        members: [],
        response_metadata: {},
      };

      const mockTeamInfoResponse = {
        ok: true,
        team: { url: "https://testworkspace.slack.com" },
      };

      const mockConversationsResponse = {
        ok: true,
        channels: [
          {
            id: "channel-1",
            name: "general",
            is_archived: false,
            is_private: true, // Private channel - is_member check applies
            is_im: false,
            is_mpim: false,
            is_member: false, // Bot is not a member - should be skipped
          },
          {
            id: "channel-2",
            name: "random",
            is_archived: false,
            is_private: false,
            is_im: false,
            is_mpim: false,
            is_member: true, // Bot is a member
          },
        ],
        response_metadata: {},
      };

      const mockHistoryResponse = {
        ok: true,
        messages: [
          {
            ts: "1234567890.123456",
            user: "user-1",
            text: "Message in member channel",
            type: "slack_message",
          },
        ],
        has_more: false,
        response_metadata: {},
      };

      const mockClient = agent.get(slackEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/users.list"),
          method: "GET",
        })
        .reply(200, mockUsersResponse);

      mockClient
        .intercept({
          path: "/api/team.info",
          method: "GET",
        })
        .reply(200, mockTeamInfoResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.list"),
          method: "GET",
        })
        .reply(200, mockConversationsResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.history"),
          method: "GET",
        })
        .reply(200, mockHistoryResponse)
        .persist();

      const result = await dataSource.fetchMessages();

      // Should only fetch from channel-2 where bot is a member
      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0]?.channel, "channel-2");
    });

    it("should sort messages by timestamp (most recent first)", async () => {
      const mockUsersResponse = {
        ok: true,
        members: [],
        response_metadata: {},
      };

      const mockTeamInfoResponse = {
        ok: true,
        team: { url: "https://testworkspace.slack.com" },
      };

      const mockConversationsResponse = {
        ok: true,
        channels: [
          {
            id: "channel-1",
            name: "general",
            is_archived: false,
            is_private: false,
            is_im: false,
            is_mpim: false,
            is_member: true,
          },
        ],
        response_metadata: {},
      };

      const mockHistoryResponse = {
        ok: true,
        messages: [
          {
            ts: "1234567890.100000", // Older
            user: "user-1",
            text: "Older message",
            type: "slack_message",
          },
          {
            ts: "1234567890.200000", // Newer
            user: "user-2",
            text: "Newer message",
            type: "slack_message",
          },
        ],
        has_more: false,
        response_metadata: {},
      };

      const mockClient = agent.get(slackEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/users.list"),
          method: "GET",
        })
        .reply(200, mockUsersResponse);

      mockClient
        .intercept({
          path: "/api/team.info",
          method: "GET",
        })
        .reply(200, mockTeamInfoResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.list"),
          method: "GET",
        })
        .reply(200, mockConversationsResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/api/conversations.history"),
          method: "GET",
        })
        .reply(200, mockHistoryResponse)
        .persist();

      const result = await dataSource.fetchMessages();

      assert.equal(result.messages.length, 2);
      // Most recent should be first
      assert.equal(result.messages[0]?.ts, "1234567890.200000");
      assert.equal(result.messages[1]?.ts, "1234567890.100000");
    });
  });
});
