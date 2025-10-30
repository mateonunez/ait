import type { LinearIssueDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLLinearIssueDescriptor implements IETLEmbeddingDescriptor<LinearIssueDataTarget> {
  public getEmbeddingText(issue: LinearIssueDataTarget): string {
    const statusText =
      issue.state === "Todo"
        ? "need to work on"
        : issue.state === "In Progress"
          ? "currently working on"
          : issue.state === "Done"
            ? "completed"
            : "tracking";

    const parts = [
      `I ${statusText}: ${issue.title}`,
      issue.description ? `${issue.description}` : null,
      issue.priority && issue.priority > 0 ? `priority ${issue.priority}` : null,
      issue.labels && issue.labels.length > 0 ? `${issue.labels.join(", ")}` : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: LinearIssueDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "issue",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export const linearDescriptorsETL = {
  issue: new ETLLinearIssueDescriptor(),
};
