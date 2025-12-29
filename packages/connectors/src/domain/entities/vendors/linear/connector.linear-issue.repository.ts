import { randomUUID } from "node:crypto";
import { AItError, LinearIssueEntity, type PaginatedResponse, type PaginationParams, getLogger } from "@ait/core";
import { type LinearIssueDataTarget, drizzleOrm, getPostgresClient, linearIssues } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorLinearIssueRepository } from "../../../../types/domain/entities/vendors/connector.linear.types";

const logger = getLogger();

export class ConnectorLinearIssueRepository implements IConnectorLinearIssueRepository {
  private _pgClient = getPostgresClient();

  async saveIssue(
    issue: LinearIssueEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const issueId = incremental ? randomUUID() : issue.id;

    try {
      const issueDataTarget = issue.toPlain<LinearIssueDataTarget>();
      issueDataTarget.id = issueId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<LinearIssueDataTarget> = {
          title: issueDataTarget.title,
          description: issueDataTarget.description,
          state: issueDataTarget.state,
          priority: issueDataTarget.priority,
          assigneeId: issueDataTarget.assigneeId,
          teamId: issueDataTarget.teamId,
          projectId: issueDataTarget.projectId,
          url: issueDataTarget.url,
          labels: issueDataTarget.labels,
          updatedAt: new Date(),
        };

        await tx
          .insert(linearIssues)
          .values(issueDataTarget)
          .onConflictDoUpdate({
            target: linearIssues.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save issue:", { issueId, error });
      throw new AItError(
        "LINEAR_SAVE_ISSUE",
        `Failed to save issue ${issueId}: ${error.message}`,
        { id: issueId },
        error,
      );
    }
  }

  async saveIssues(issues: LinearIssueEntity[]): Promise<void> {
    if (!issues.length) {
      return;
    }

    try {
      for (const issue of issues) {
        await this.saveIssue(issue, { incremental: true });
      }
    } catch (error) {
      logger.error("Error saving issues:", { error });
      throw new AItError("LINEAR_SAVE_ISSUE_BULK", "Failed to save issues to repository");
    }
  }

  async getIssue(id: string): Promise<LinearIssueEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(linearIssues)
      .where(drizzleOrm.eq(linearIssues.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return LinearIssueEntity.fromPlain(result[0]! as LinearIssueDataTarget);
  }

  async fetchIssues(): Promise<LinearIssueEntity[]> {
    const results = await this._pgClient.db.select().from(linearIssues);
    return results.map((result) => LinearIssueEntity.fromPlain(result as LinearIssueDataTarget));
  }

  async getIssuesPaginated(params: PaginationParams): Promise<PaginatedResponse<LinearIssueEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [issues, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(linearIssues)
        .orderBy(drizzleOrm.desc(linearIssues.updatedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(linearIssues),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: issues.map((issue) => LinearIssueEntity.fromPlain(issue as LinearIssueDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
