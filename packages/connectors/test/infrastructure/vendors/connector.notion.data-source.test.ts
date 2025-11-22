import {
  ConnectorNotionDataSource,
  type IConnectorNotionDataSource,
} from "../../../src/infrastructure/vendors/notion/connector.notion.data-source";
import { AItError } from "@ait/core";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";

describe("ConnectorNotionDataSource", () => {
  let agent: MockAgent;
  let dataSource: IConnectorNotionDataSource;
  let mockAccessToken: string;
  const notionEndpoint = "https://api.notion.com";

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorNotionDataSource(mockAccessToken);
  });

  describe("fetchPages", () => {
    it("should return a list of pages", async () => {
      const mockSearchResponse = {
        object: "list",
        results: [
          {
            object: "page",
            id: "page-1",
            created_time: "2025-01-01T00:00:00.000Z",
            last_edited_time: "2025-01-02T00:00:00.000Z",
            created_by: { object: "user", id: "user-1" },
            last_edited_by: { object: "user", id: "user-2" },
            cover: null,
            icon: { type: "emoji", emoji: "📄" },
            parent: { type: "workspace" },
            archived: false,
            properties: { title: { title: [{ plain_text: "Test Page" }] } },
            url: "https://notion.so/page-1",
          },
        ],
        next_cursor: null,
        has_more: false,
      };

      const mockBlocksResponse = {
        object: "list",
        results: [
          {
            object: "block",
            id: "block-1",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  plain_text: "This is test content",
                  text: { content: "This is test content" },
                },
              ],
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      };

      const mockClient = agent.get(notionEndpoint);
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        })
        .reply(200, mockSearchResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/v1/blocks/page-1/children"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        })
        .reply(200, mockBlocksResponse);

      const result = await dataSource.fetchPages();

      assert.equal(result.pages.length, 1);
      assert.equal(result.pages[0]?.id, "page-1");
      assert.equal(result.pages[0]?.__type, "page");
      assert.equal(result.pages[0]?.url, "https://notion.so/page-1");
      assert.ok(result.pages[0]?.content?.includes("This is test content"));
    });

    it("should handle pagination", async () => {
      const mockSearchResponsePage1 = {
        object: "list",
        results: [
          {
            object: "page",
            id: "page-1",
            created_time: "2025-01-01T00:00:00.000Z",
            last_edited_time: "2025-01-02T00:00:00.000Z",
            created_by: { object: "user", id: "user-1" },
            last_edited_by: { object: "user", id: "user-2" },
            cover: null,
            icon: null,
            parent: { type: "workspace" },
            archived: false,
            properties: {},
            url: "https://notion.so/page-1",
          },
        ],
        next_cursor: "cursor-123",
        has_more: true,
      };

      const mockSearchResponsePage2 = {
        object: "list",
        results: [
          {
            object: "page",
            id: "page-2",
            created_time: "2025-01-01T00:00:00.000Z",
            last_edited_time: "2025-01-02T00:00:00.000Z",
            created_by: { object: "user", id: "user-1" },
            last_edited_by: { object: "user", id: "user-2" },
            cover: null,
            icon: null,
            parent: { type: "workspace" },
            archived: false,
            properties: {},
            url: "https://notion.so/page-2",
          },
        ],
        next_cursor: null,
        has_more: false,
      };

      const mockBlocksResponse = {
        object: "list",
        results: [],
        next_cursor: null,
        has_more: false,
      };

      const mockClient = agent.get(notionEndpoint);
      // First page request (without cursor)
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: (body) => {
            const parsed = JSON.parse(body.toString());
            return !parsed.start_cursor; // First request has no cursor
          },
        })
        .reply(200, mockSearchResponsePage1);

      // Second page request (with cursor)
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
          body: (body) => {
            const parsed = JSON.parse(body.toString());
            return parsed.start_cursor === "cursor-123"; // Second request has cursor
          },
        })
        .reply(200, mockSearchResponsePage2);

      // Block requests for page-1
      mockClient
        .intercept({
          path: (path) => path.startsWith("/v1/blocks/page-1/children"),
          method: "GET",
        })
        .reply(200, mockBlocksResponse);

      // Block requests for page-2
      mockClient
        .intercept({
          path: (path) => path.startsWith("/v1/blocks/page-2/children"),
          method: "GET",
        })
        .reply(200, mockBlocksResponse);

      const result1 = await dataSource.fetchPages();
      assert.equal(result1.pages.length, 1);
      assert.equal(result1.pages[0]?.id, "page-1");
      assert.equal(result1.nextCursor, "cursor-123");

      const result2 = await dataSource.fetchPages(result1.nextCursor);
      assert.equal(result2.pages.length, 1);
      assert.equal(result2.pages[0]?.id, "page-2");
    });

    it("should handle authentication errors", async () => {
      const mockClient = agent.get(notionEndpoint);
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        })
        .reply(401, { object: "error", status: 401, code: "unauthorized", message: "Invalid access token" });

      await assert.rejects(
        () => dataSource.fetchPages(),
        (error) => {
          assert.ok(error instanceof Error);
          return true;
        },
      );
    });

    it("should handle invalid response structure", async () => {
      const mockClient = agent.get(notionEndpoint);
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        })
        .reply(200, { invalid: "response" });

      await assert.rejects(
        () => dataSource.fetchPages(),
        (error) => {
          assert.ok(error instanceof AItError);
          assert.equal(error.code, "NOTION_NO_DATA");
          return true;
        },
      );
    });

    it("should handle block fetch failures gracefully", async () => {
      const mockSearchResponse = {
        object: "list",
        results: [
          {
            object: "page",
            id: "page-1",
            created_time: "2025-01-01T00:00:00.000Z",
            last_edited_time: "2025-01-02T00:00:00.000Z",
            created_by: { object: "user", id: "user-1" },
            last_edited_by: { object: "user", id: "user-2" },
            cover: null,
            icon: null,
            parent: { type: "workspace" },
            archived: false,
            properties: {},
            url: "https://notion.so/page-1",
          },
        ],
        next_cursor: null,
        has_more: false,
      };

      const mockClient = agent.get(notionEndpoint);
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json",
          },
        })
        .reply(200, mockSearchResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/v1/blocks/page-1/children"),
          method: "GET",
        })
        .reply(500, { error: "Internal server error" });

      const result = await dataSource.fetchPages();

      assert.equal(result.pages.length, 1);
      assert.equal(result.pages[0]?.id, "page-1");
      // Content should be null when block fetch fails (empty string becomes null due to || null)
      assert.equal(result.pages[0]?.content, null);
    });

    it("should extract text from different block types", async () => {
      const mockSearchResponse = {
        object: "list",
        results: [
          {
            object: "page",
            id: "page-1",
            created_time: "2025-01-01T00:00:00.000Z",
            last_edited_time: "2025-01-02T00:00:00.000Z",
            created_by: { object: "user", id: "user-1" },
            last_edited_by: { object: "user", id: "user-2" },
            cover: null,
            icon: null,
            parent: { type: "workspace" },
            archived: false,
            properties: {},
            url: "https://notion.so/page-1",
          },
        ],
        next_cursor: null,
        has_more: false,
      };

      const mockBlocksResponse = {
        object: "list",
        results: [
          {
            object: "block",
            id: "block-1",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", plain_text: "Paragraph text" }],
            },
          },
          {
            object: "block",
            id: "block-2",
            type: "code",
            code: {
              rich_text: [{ type: "text", plain_text: "const x = 1;" }],
            },
          },
          {
            object: "block",
            id: "block-3",
            type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ type: "text", plain_text: "List item" }],
            },
          },
        ],
        next_cursor: null,
        has_more: false,
      };

      const mockClient = agent.get(notionEndpoint);
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
        })
        .reply(200, mockSearchResponse);

      mockClient
        .intercept({
          path: (path) => path.startsWith("/v1/blocks/page-1/children"),
          method: "GET",
        })
        .reply(200, mockBlocksResponse);

      const result = await dataSource.fetchPages();

      assert.equal(result.pages.length, 1);
      assert.ok(result.pages[0]?.content?.includes("Paragraph text"));
      assert.ok(result.pages[0]?.content?.includes("Code: const x = 1;"));
      assert.ok(result.pages[0]?.content?.includes("• List item"));
    });

    it("should sort pages by last edited time (most recent first)", async () => {
      const mockSearchResponse = {
        object: "list",
        results: [
          {
            object: "page",
            id: "page-old",
            created_time: "2025-01-01T00:00:00.000Z",
            last_edited_time: "2025-01-01T00:00:00.000Z",
            created_by: { object: "user", id: "user-1" },
            last_edited_by: { object: "user", id: "user-2" },
            cover: null,
            icon: null,
            parent: { type: "workspace" },
            archived: false,
            properties: {},
            url: "https://notion.so/page-old",
          },
          {
            object: "page",
            id: "page-new",
            created_time: "2025-01-01T00:00:00.000Z",
            last_edited_time: "2025-01-03T00:00:00.000Z",
            created_by: { object: "user", id: "user-1" },
            last_edited_by: { object: "user", id: "user-2" },
            cover: null,
            icon: null,
            parent: { type: "workspace" },
            archived: false,
            properties: {},
            url: "https://notion.so/page-new",
          },
        ],
        next_cursor: null,
        has_more: false,
      };

      const mockBlocksResponse = {
        object: "list",
        results: [],
        next_cursor: null,
        has_more: false,
      };

      const mockClient = agent.get(notionEndpoint);
      mockClient
        .intercept({
          path: "/v1/search",
          method: "POST",
        })
        .reply(200, mockSearchResponse);

      // Block requests for page-old
      mockClient
        .intercept({
          path: (path) => path.startsWith("/v1/blocks/page-old/children"),
          method: "GET",
        })
        .reply(200, mockBlocksResponse);

      // Block requests for page-new
      mockClient
        .intercept({
          path: (path) => path.startsWith("/v1/blocks/page-new/children"),
          method: "GET",
        })
        .reply(200, mockBlocksResponse);

      const result = await dataSource.fetchPages();

      assert.equal(result.pages.length, 2);
      // Most recent should be first
      assert.equal(result.pages[0]?.id, "page-new");
      assert.equal(result.pages[1]?.id, "page-old");
    });
  });
});
