import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";
import type { LinearIssueEntity } from "@ait/core";
import { closePostgresConnection, drizzleOrm, getPostgresClient, linearIssues } from "@ait/postgres";
import { ConnectorLinearIssueRepository } from "../../../../src/domain/entities/vendors/linear/connector.linear-issue.repository";

describe("ConnectorLinearRepository", () => {
  const repository = new ConnectorLinearIssueRepository();
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorLinearIssueRepository", () => {
    beforeEach(async () => {
      await db.delete(linearIssues).execute();
    });

    describe("saveIssue", () => {
      it("should save issue successfully", async () => {
        const now = new Date();
        const issue: LinearIssueEntity = {
          id: "test-issue-1",
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
          url: "https://linear.app/issue/test-issue-1",
          labels: ["bug", "frontend"],
          createdAt: now,
          updatedAt: now,
          __type: "issue",
        };

        await repository.saveIssue(issue);

        const saved = await db.select().from(linearIssues).where(drizzleOrm.eq(linearIssues.id, issue.id)).execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, issue.id);
        assert.equal(saved[0].title, issue.title);
      });

      it("should throw on missing issue ID", async () => {
        const issue = {} as LinearIssueEntity;
        await assert.rejects(() => repository.saveIssue(issue), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveIssues", () => {
      it("should save multiple issues", async () => {
        const now = new Date();
        const issues: LinearIssueEntity[] = [
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
            labels: ["bug"],
            createdAt: now,
            updatedAt: now,
            __type: "issue",
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
            labels: ["feature", "backend"],
            createdAt: now,
            updatedAt: now,
            __type: "issue",
          },
        ];

        await repository.saveIssues(issues);

        const saved = await db.select().from(linearIssues).execute();
        assert.equal(saved.length, 2, "Expected two issues to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await repository.saveIssues([]);
        const saved = await db.select().from(linearIssues).execute();
        assert.equal(saved.length, 0, "No issues should be saved for empty input");
      });
    });

    describe("getIssuesPaginated", () => {
      it("should return paginated issues", async () => {
        const now = new Date();
        const issues: LinearIssueEntity[] = Array.from({ length: 15 }, (_, i) => ({
          id: `issue-${i + 1}`,
          title: `Issue ${i + 1}`,
          description: `Description ${i + 1}`,
          state: i % 3 === 0 ? "Todo" : i % 3 === 1 ? "In Progress" : "Done",
          priority: (i % 4) + 1,
          assigneeId: i % 2 === 0 ? `assignee-${(i % 2) + 1}` : null,
          assigneeName: i % 2 === 0 ? `Assignee ${(i % 2) + 1}` : null,
          teamId: `team-${(i % 3) + 1}`,
          teamName: `Team ${(i % 3) + 1}`,
          projectId: i % 2 === 0 ? `project-${(i % 2) + 1}` : null,
          projectName: i % 2 === 0 ? `Project ${(i % 2) + 1}` : null,
          url: `https://linear.app/issue/issue-${i + 1}`,
          labels: [`label-${(i % 2) + 1}`],
          createdAt: new Date(now.getTime() + i * 1000),
          updatedAt: new Date(now.getTime() + i * 1000),
          __type: "issue",
        }));

        await repository.saveIssues(issues);

        const result = await repository.getIssuesPaginated({ page: 1, limit: 5 });
        assert.equal(result.data.length, 5);
        assert.equal(result.pagination.page, 1);
        assert.equal(result.pagination.limit, 5);
        assert.equal(result.pagination.total, 15);
        assert.equal(result.pagination.totalPages, 3);
      });

      it("should return correct page for second page", async () => {
        const now = new Date();
        const issues: LinearIssueEntity[] = Array.from({ length: 10 }, (_, i) => ({
          id: `issue-${i + 1}`,
          title: `Issue ${i + 1}`,
          description: `Description ${i + 1}`,
          state: "Todo",
          priority: 1,
          assigneeId: null,
          assigneeName: null,
          teamId: "team-1",
          teamName: "Team One",
          projectId: null,
          projectName: null,
          url: `https://linear.app/issue/issue-${i + 1}`,
          labels: [],
          createdAt: new Date(now.getTime() + i * 1000),
          updatedAt: new Date(now.getTime() + i * 1000),
          __type: "issue",
        }));

        await repository.saveIssues(issues);

        const result = await repository.getIssuesPaginated({ page: 2, limit: 3 });
        assert.equal(result.data.length, 3);
        assert.equal(result.pagination.page, 2);
        assert.equal(result.pagination.limit, 3);
        assert.equal(result.pagination.total, 10);
        assert.equal(result.pagination.totalPages, 4);
      });

      it("should return empty array when no issues exist", async () => {
        const result = await repository.getIssuesPaginated({ page: 1, limit: 10 });
        assert.equal(result.data.length, 0);
        assert.equal(result.pagination.total, 0);
        assert.equal(result.pagination.totalPages, 0);
      });
    });
  });
});
