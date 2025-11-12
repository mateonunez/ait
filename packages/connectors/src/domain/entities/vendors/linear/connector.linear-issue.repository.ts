import { AItError, type LinearIssueEntity } from "@ait/core";
import { connectorLinearIssueMapper } from "../../../../domain/mappers/vendors/connector.linear.mapper";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorLinearIssueRepository } from "../../../../types/domain/entities/vendors/connector.linear.types";
import { getPostgresClient, linearIssues, type LinearIssueDataTarget } from "@ait/postgres";
import { randomUUID } from "node:crypto";

export class ConnectorLinearIssueRepository implements IConnectorLinearIssueRepository {
  private _pgClient = getPostgresClient();

  async saveIssue(
    issue: LinearIssueEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const issueId = incremental ? randomUUID() : issue.id;

    try {
      const issueDataTarget = connectorLinearIssueMapper.domainToDataTarget(issue);
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
          updatedAt: issueDataTarget.updatedAt ?? new Date(),
        };

        if (issueDataTarget.createdAt) {
          updateValues.createdAt = issueDataTarget.createdAt;
        }

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
      console.error("Failed to save issue:", { issueId, error });
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
      console.debug("Saving issues to Linear repository:", { issues });

      for (const issue of issues) {
        await this.saveIssue(issue, { incremental: true });
      }
    } catch (error) {
      console.error("Error saving issues:", error);
      throw new AItError("LINEAR_SAVE_ISSUE_BULK", "Failed to save issues to repository");
    }
  }

  async getIssue(id: string): Promise<LinearIssueEntity | null> {
    console.log("Getting issue from Linear repository", id);
    return null;
  }

  async getIssues(): Promise<LinearIssueEntity[]> {
    console.log("Getting issues from Linear repository");
    return [];
  }
}
