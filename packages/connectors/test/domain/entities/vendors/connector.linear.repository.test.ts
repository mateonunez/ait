import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm, linearIssues } from "@ait/postgres";
import type { LinearIssueEntity } from "@/types/domain/entities/vendors/connector.linear.types";
import { ConnectorLinearIssueRepository } from "@/domain/entities/vendors/linear/connector.linear-issue.repository";

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
          teamId: "team-1",
          projectId: "project-1",
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
            teamId: "team-1",
            projectId: null,
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
            teamId: "team-2",
            projectId: "project-2",
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
  });
});
