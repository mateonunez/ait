import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { LinearIssueEntity } from "@ait/core";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { ConnectorLinearStore } from "../../../src/infrastructure/vendors/linear/connector.linear.store";
import { LINEAR_ENTITY_TYPES_ENUM } from "../../../src/services/vendors/connector.vendors.config";
import type { IConnectorOAuthTokenResponse } from "../../../src/shared/auth/lib/oauth/connector.oauth";
import type { IConnectorLinearRepository } from "../../../src/types/domain/entities/vendors/connector.linear.types";

describe("ConnectorLinearStore", () => {
  let mockRepository: IConnectorLinearRepository;
  let store: ConnectorLinearStore;

  beforeEach(() => {
    mockRepository = {
      issue: {
        saveIssue: async (_issue: LinearIssueEntity) => {},
      },
      saveAuthenticationData: async (_data: IConnectorOAuthTokenResponse) => {},
      getAuthenticationData: async () => null,
    } as unknown as IConnectorLinearRepository;

    store = new ConnectorLinearStore(mockRepository);
  });

  describe("save", () => {
    it("should call saveIssue for a single issue item", async () => {
      let savedIssue: LinearIssueEntity | undefined;
      mockRepository.issue.saveIssue = async (issue: LinearIssueEntity) => {
        savedIssue = issue;
      };

      const issue: LinearIssueEntity = {
        id: "issue-1",
        title: "Test Issue",
        description: "Test Description",
        state: "In Progress",
        priority: 1,
        assigneeId: "assignee-1",
        assigneeName: "Test Assignee",
        teamId: "team-1",
        teamName: "Test Team",
        projectId: "project-1",
        projectName: "Test Project",
        url: "https://linear.app/issue/issue-1",
        labels: ["bug"],
        createdAt: new Date(),
        updatedAt: new Date(),
        __type: LINEAR_ENTITY_TYPES_ENUM.ISSUE,
      } as unknown as any;

      await store.save(issue);

      assert.ok(savedIssue, "Expected saveIssue to be called");
      assert.strictEqual(savedIssue, issue);
    });

    it("should call saveIssue for multiple issue items", async () => {
      const savedIssues: LinearIssueEntity[] = [];
      mockRepository.issue.saveIssue = async (issue: LinearIssueEntity) => {
        savedIssues.push(issue);
      };

      const issues: any[] = [
        {
          id: "issue-1",
          title: "Issue 1",
          description: "Description 1",
          state: "Todo",
          priority: 2,
          assigneeId: null,
          assigneeName: null,
          teamId: "team-1",
          teamName: "Team One",
          projectId: null,
          projectName: null,
          url: "https://linear.app/issue/issue-1",
          labels: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "linear_issue",
        },
        {
          id: "issue-2",
          title: "Issue 2",
          description: "Description 2",
          state: "Done",
          priority: 3,
          assigneeId: "assignee-2",
          assigneeName: "Assignee Two",
          teamId: "team-2",
          teamName: "Team Two",
          projectId: "project-2",
          projectName: "Project Two",
          url: "https://linear.app/issue/issue-2",
          labels: ["feature"],
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "linear_issue",
        },
      ];

      await store.save(issues);

      assert.equal(savedIssues.length, 2, "Expected saveIssue to be called twice");
      assert.strictEqual(savedIssues[0], issues[0]);
      assert.strictEqual(savedIssues[1], issues[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedEntity = {
        id: "unsupported-1",
        title: "Some Entity",
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
        access_token: "linear-access-token",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "linear-refresh-token",
        scope: "read,write",
      };

      await store.saveAuthenticationData(authData);

      assert.ok(authDataPassed, "Expected saveAuthenticationData to be called");
      assert.deepEqual(authDataPassed, authData);
    });
  });

  describe("getAuthenticationData", () => {
    it("should return the authentication data from the repository", async () => {
      const expectedAuthData: OAuthTokenDataTarget = {
        accessToken: "linear-access-token",
        tokenType: "Bearer",
        expiresIn: "3600",
        refreshToken: "linear-refresh-token",
        scope: "read,write",
        id: "test-id",
        userId: "test-user-id",
        provider: "linear",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.getAuthenticationData = async () => expectedAuthData;

      const authData = await store.getAuthenticationData();

      assert.deepEqual(authData, expectedAuthData);
    });
  });
});
