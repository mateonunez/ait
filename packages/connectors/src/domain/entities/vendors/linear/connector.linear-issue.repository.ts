import { connectorLinearIssueMapper } from "@/domain/mappers/vendors/connector.linear.mapper";
import type { IConnectorRepositorySaveOptions } from "@/types/domain/entities/connector.repository.interface";
import type {
  IConnectorLinearIssueRepository,
  LinearIssueEntity,
} from "@/types/domain/entities/vendors/connector.linear.types";
import { getPostgresClient, linearIssues } from "@ait/postgres";
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
      console.debug("Before mapping issue to data target:", issue);
      const issueDataTarget = connectorLinearIssueMapper.domainToDataTarget(issue);
      console.debug("After mapping issue to data target:", issueDataTarget);
      issueDataTarget.id = issueId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx
          .insert(linearIssues)
          .values(issueDataTarget)
          .onConflictDoUpdate({
            target: linearIssues.id,
            set: {
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
            },
          })
          .execute();
      });

      console.debug("Issue saved successfully:", { issueId });
    } catch (error: any) {
      console.error("Failed to save issue:", { issueId, error });
      throw new Error(`Failed to save issue ${issueId}: ${error.message}`);
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

      console.debug("Issues saved successfully:", { issues: issues.length });
    } catch (error) {
      console.error("Error saving issues:", error);
      throw new Error("Failed to save issues to repository");
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
