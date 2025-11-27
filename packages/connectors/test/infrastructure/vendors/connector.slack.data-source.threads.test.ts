import {
  ConnectorSlackDataSource,
  type IConnectorSlackDataSource,
} from "../../../src/infrastructure/vendors/slack/connector.slack.data-source";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";

describe("ConnectorSlackDataSource Reproduction", () => {
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

  it("should fetch thread replies when a message has replies", async () => {
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

    const parentMessageTs = "1234567890.123456";
    const replyMessageTs = "1234567890.123457";

    const mockHistoryResponse = {
      ok: true,
      messages: [
        {
          ts: parentMessageTs,
          user: "user-1",
          text: "Parent message",
          type: "message",
          thread_ts: parentMessageTs,
          reply_count: 1,
        },
      ],
      has_more: false,
      response_metadata: {},
    };

    const mockRepliesResponse = {
      ok: true,
      messages: [
        {
          ts: parentMessageTs,
          user: "user-1",
          text: "Parent message",
          type: "message",
          thread_ts: parentMessageTs,
          reply_count: 1,
        },
        {
          ts: replyMessageTs,
          user: "user-2",
          text: "Reply message",
          type: "message",
          thread_ts: parentMessageTs,
          parent_user_id: "user-1",
        },
      ],
      has_more: false,
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

    // This interceptor is for the fix we expect to implement
    // If the code doesn't call conversations.replies, this won't be hit, which is fine for now
    // But we want to assert that we get the reply message
    mockClient
      .intercept({
        path: (path) => path.startsWith("/api/conversations.replies"),
        method: "GET",
      })
      .reply(200, mockRepliesResponse);

    const result = await dataSource.fetchMessages();

    // We expect 2 messages: the parent and the reply
    // Currently this will fail because it only fetches the parent
    const replyMessage = result.messages.find((m) => m.ts === replyMessageTs);
    assert.ok(replyMessage, "Should have fetched the reply message");
    assert.equal(replyMessage.text, "Reply message");
  });
});
