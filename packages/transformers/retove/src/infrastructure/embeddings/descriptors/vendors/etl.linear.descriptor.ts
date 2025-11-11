import type { LinearIssueDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";

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

    const priorityLabels: Record<number, string> = {
      0: "urgent",
      1: "high priority",
      2: "medium priority",
      3: "low priority",
      4: "no priority",
    };
    const priorityText =
      issue.priority !== null && issue.priority !== undefined
        ? priorityLabels[issue.priority] || `priority ${issue.priority}`
        : null;

    // CRITICAL: Sanitize description to prevent JSON encoding errors
    const sanitizedDescription = issue.description ? TextSanitizer.sanitize(issue.description) : null;

    // Sanitize title as well for safety
    const sanitizedTitle = TextSanitizer.sanitize(issue.title);

    const parts = [
      `I ${statusText}: ${sanitizedTitle}`,
      issue.teamName ? `in ${issue.teamName}` : null,
      priorityText,
      issue.assigneeName ? `assigned to ${issue.assigneeName}` : null,
      issue.projectName ? `project: ${issue.projectName}` : null,
      sanitizedDescription ? `${sanitizedDescription}` : null,
      issue.labels && issue.labels.length > 0 ? `labels: ${issue.labels.join(", ")}` : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: LinearIssueDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      title: TextSanitizer.sanitize(entityWithoutInternalTimestamps.title, 500),
      description: entityWithoutInternalTimestamps.description
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.description, 1000)
        : null,
    };

    return {
      __type: "issue",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const linearDescriptorsETL = {
  issue: new ETLLinearIssueDescriptor(),
};
