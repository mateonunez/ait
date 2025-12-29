import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { AItError } from "@ait/core";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorLinearDataSource } from "../../../src/infrastructure/vendors/linear/connector.linear.data-source";

describe("ConnectorLinearDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorLinearDataSource;
  let mockAccessToken: string;
  const linearEndpoint = "https://api.linear.app";

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorLinearDataSource(mockAccessToken);
  });

  describe("fetchIssues", () => {
    it("should return a list of issues", async () => {
      const mockClient = agent.get(linearEndpoint);
      mockClient
        .intercept({
          path: "/graphql",
          method: "POST",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, {
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-1",
                  title: "Test Issue",
                  description: "Test Description",
                  state: { name: "In Progress" },
                  priority: 1,
                  assignee: { id: "assignee-1" },
                  team: { id: "team-1" },
                  project: { id: "project-1" },
                  url: "https://linear.app/issue/issue-1",
                  labels: { nodes: [{ name: "bug" }] },
                  createdAt: "2025-01-01T00:00:00Z",
                  updatedAt: "2025-01-01T00:00:00Z",
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: "cursor-1",
              },
            },
          },
        });

      const result = await dataSource.fetchIssues();
      assert.equal(result.issues.length, 1);
      assert.equal(result.issues[0]?.id, "issue-1");
      assert.equal(result.issues[0]?.__type, "linear_issue");
    });

    it("should handle invalid access token error", async () => {
      const mockClient = agent.get(linearEndpoint);
      mockClient
        .intercept({
          path: "/graphql",
          method: "POST",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(401, { error: { message: "Invalid access token" } });

      await assert.rejects(
        () => dataSource.fetchIssues(),
        (error) => {
          assert.ok(error instanceof AItError);
          assert.strictEqual(error.code, "HTTP_401");
          return true;
        },
      );
    });

    it("should handle GraphQL errors", async () => {
      const mockClient = agent.get(linearEndpoint);
      mockClient
        .intercept({
          path: "/graphql",
          method: "POST",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, {
          errors: [{ message: "GraphQL error" }],
        });

      await assert.rejects(
        () => dataSource.fetchIssues(),
        (error) => {
          assert.ok(error instanceof AItError);
          assert.strictEqual(error.code, "LINEAR_GRAPHQL");
          return true;
        },
      );
    });
  });
});
