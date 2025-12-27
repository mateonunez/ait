import { randomUUID } from "node:crypto";
import { AItError, type PaginatedResponse, type PaginationParams, getLogger } from "@ait/core";
import { type LinearIssueDataTarget, drizzleOrm, getPostgresClient, linearIssues } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorLinearIssueRepository } from "../../../../types/domain/entities/vendors/connector.linear.types";
import { linearIssueDataTargetToDomain, linearIssueDomainToDataTarget } from "../../linear/linear-issue.entity";
import type { LinearIssueEntity } from "../../linear/linear-issue.entity";

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
      const issueDataTarget = linearIssueDomainToDataTarget(issue);
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
      logger.debug("Saving issues to Linear repository:", { issues });

      for (const issue of issues) {
        await this.saveIssue(issue, { incremental: true });
      }
    } catch (error) {
      logger.error("Error saving issues:", { error });
      throw new AItError("LINEAR_SAVE_ISSUE_BULK", "Failed to save issues to repository");
    }
  }

  async getIssue(id: string): Promise<LinearIssueEntity | null> {
    logger.info("Getting issue from Linear repository", { id });
    return null;
  }

  async fetchIssues(): Promise<LinearIssueEntity[]> {
    logger.info("Getting issues from Linear repository");
    return [];
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
      data: issues.map((issue) => linearIssueDataTargetToDomain(issue as LinearIssueDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
