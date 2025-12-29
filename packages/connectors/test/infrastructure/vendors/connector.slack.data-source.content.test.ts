import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import {
  ConnectorSlackDataSource,
  type IConnectorSlackDataSource,
} from "../../../src/infrastructure/vendors/slack/connector.slack.data-source";

describe("ConnectorSlackDataSource Content Detection", () => {
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

  // Helper to set up common mocks
  function setupBaseMocks(mockClient: ReturnType<MockAgent["get"]>) {
    const mockUsersResponse = {
      ok: true,
      members: [],
      response_metadata: {},
    };

    const mockTeamInfoResponse = {
      ok: true,
      team: { url: "https://testworkspace.slack.com" },
    };

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
  }

  it("should include messages with only blocks (no text)", async () => {
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

    // Message with blocks - used for sorting check AND main fetch
    const mockHistoryResponse = {
      ok: true,
      messages: [
        {
          ts: "1234567890.000001",
          user: "user-1",
          text: "",
          type: "slack_message",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "This is a message with blocks",
              },
            },
          ],
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockClient = agent.get(slackEndpoint);
    setupBaseMocks(mockClient);

    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.list"),
        method: "GET",
      })
      .reply(200, mockConversationsResponse);

    // Mock history call during conversation sorting (limit=1)
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.history") && path.includes("limit=1"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    // Mock main history call (limit=15)
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.history") && path.includes("limit=15"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    const result = await dataSource.fetchMessages();

    // Should include messages with blocks even if they don't have text
    assert.equal(result.messages.length, 1);
  });

  it("should include messages with only attachments (no text)", async () => {
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
          ts: "1234567890.000001",
          user: "user-1",
          text: "",
          type: "slack_message",
          attachments: [
            {
              fallback: "Attachment",
              text: "This is an attachment",
            },
          ],
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockClient = agent.get(slackEndpoint);
    setupBaseMocks(mockClient);

    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.list"),
        method: "GET",
      })
      .reply(200, mockConversationsResponse);

    // Mock history call during conversation sorting (limit=1)
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.history") && path.includes("limit=1"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    // Mock main history call (limit=15)
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.history") && path.includes("limit=15"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    const result = await dataSource.fetchMessages();

    // Should include messages with attachments even if they don't have text
    assert.equal(result.messages.length, 1);
    assert.ok(result.messages[0]?.attachments);
  });

  it("should filter out system messages like channel_join", async () => {
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

    // Mix of regular messages and system messages
    const mockHistoryResponse = {
      ok: true,
      messages: [
        {
          ts: "1234567890.000003",
          user: "user-1",
          text: "Regular message",
          type: "slack_message",
        },
        {
          ts: "1234567890.000002",
          user: "user-1",
          text: "joined the channel",
          type: "slack_message",
          subtype: "channel_join",
        },
        {
          ts: "1234567890.000001",
          user: "user-1",
          text: "changed the channel topic",
          type: "slack_message",
          subtype: "channel_topic",
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockClient = agent.get(slackEndpoint);
    setupBaseMocks(mockClient);

    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.list"),
        method: "GET",
      })
      .reply(200, mockConversationsResponse);

    // Mock for sorting
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.history") && path.includes("limit=1"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    // Mock main history call
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.history") && path.includes("limit=15"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    const result = await dataSource.fetchMessages();

    // Should only include the regular message, not system messages
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0]?.text, "Regular message");
  });

  it("should sort conversations by latest activity", async () => {
    // Two channels - channel-2 has more recent activity
    const mockConversationsResponse = {
      ok: true,
      channels: [
        {
          id: "channel-1",
          name: "old-channel",
          is_archived: false,
          is_private: false,
          is_im: false,
          is_mpim: false,
          is_member: true,
        },
        {
          id: "channel-2",
          name: "active-channel",
          is_archived: false,
          is_private: false,
          is_im: false,
          is_mpim: false,
          is_member: true,
        },
      ],
      response_metadata: {},
    };

    // Old message for channel-1
    const oldHistoryResponse = {
      ok: true,
      messages: [
        {
          ts: "1000000000.000001",
          user: "user-1",
          text: "Old message",
          type: "slack_message",
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    // Recent message for channel-2
    const recentHistoryResponse = {
      ok: true,
      messages: [
        {
          ts: "1732700000.000001", // Much more recent timestamp
          user: "user-1",
          text: "Recent message",
          type: "slack_message",
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockClient = agent.get(slackEndpoint);
    setupBaseMocks(mockClient);

    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.list"),
        method: "GET",
      })
      .reply(200, mockConversationsResponse);

    // Sorting calls (limit=1) - return different timestamps to affect sort order
    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=1") &&
          path.includes("channel=channel-1"),
        method: "GET",
      })
      .reply(200, oldHistoryResponse);

    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=1") &&
          path.includes("channel=channel-2"),
        method: "GET",
      })
      .reply(200, recentHistoryResponse);

    // Main fetch should process the most recently active channel first (channel-2)
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.history") && path.includes("limit=15"),
        method: "GET",
      })
      .reply(200, recentHistoryResponse);

    const result = await dataSource.fetchMessages();

    // Should return message from the more recently active channel first
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0]?.text, "Recent message");
  });

  it("should handle pagination cursor correctly", async () => {
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

    const mockHistoryResponse1 = {
      ok: true,
      messages: [
        {
          ts: "1234567890.000001",
          user: "user-1",
          text: "Message from general",
          type: "slack_message",
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockHistoryResponse2 = {
      ok: true,
      messages: [
        {
          ts: "1234567890.000002",
          user: "user-1",
          text: "Message from random",
          type: "slack_message",
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockClient = agent.get(slackEndpoint);
    setupBaseMocks(mockClient);

    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.list"),
        method: "GET",
      })
      .reply(200, mockConversationsResponse);

    // Sorting calls
    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=1") &&
          path.includes("channel=channel-1"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse1);

    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=1") &&
          path.includes("channel=channel-2"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse2);

    // Main fetch for first channel
    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=15") &&
          path.includes("channel=channel"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse1);

    const result = await dataSource.fetchMessages();

    assert.equal(result.messages.length, 1);
    // Should have a cursor to continue to next channel
    assert.ok(result.nextCursor);

    // Parse cursor to verify structure
    const cursor = JSON.parse(result.nextCursor);
    assert.ok(cursor.channelIndex !== undefined);
  });

  it("should handle not_in_channel error gracefully", async () => {
    const mockConversationsResponse = {
      ok: true,
      channels: [
        {
          id: "channel-1",
          name: "restricted",
          is_archived: false,
          is_private: false,
          is_im: false,
          is_mpim: false,
          is_member: true,
        },
        {
          id: "channel-2",
          name: "accessible",
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
          ts: "1234567890.000001",
          user: "user-1",
          text: "Accessible message",
          type: "slack_message",
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockNotInChannelResponse = {
      ok: false,
      error: "not_in_channel",
    };

    const mockClient = agent.get(slackEndpoint);
    setupBaseMocks(mockClient);

    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.list"),
        method: "GET",
      })
      .reply(200, mockConversationsResponse);

    // Sorting call for channel-1 returns not_in_channel
    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=1") &&
          path.includes("channel=channel-1"),
        method: "GET",
      })
      .reply(200, mockNotInChannelResponse);

    // Sorting call for channel-2 succeeds
    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=1") &&
          path.includes("channel=channel-2"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    // Main fetch - channel-2 should be processed (channel-1 skipped due to not_in_channel)
    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=15") &&
          path.includes("channel=channel-2"),
        method: "GET",
      })
      .reply(200, mockHistoryResponse);

    // In case channel-1 is tried first (sorted by activity)
    mockClient
      .intercept({
        path: (path) =>
          path.startsWith("/api/conversations.history") &&
          path.includes("limit=15") &&
          path.includes("channel=channel-1"),
        method: "GET",
      })
      .reply(200, mockNotInChannelResponse);

    const result = await dataSource.fetchMessages();

    // Should skip the restricted channel and return messages from accessible one
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0]?.text, "Accessible message");
  });
});
