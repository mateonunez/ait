import type { LinearIssueDataTarget } from "@ait/postgres";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLLinearIssueDescriptor implements IETLEmbeddingDescriptor<LinearIssueDataTarget> {
  public getEmbeddingText(issue: LinearIssueDataTarget): string {
    const priorityLabels: Record<number, string> = {
      0: "urgent",
      1: "high",
      2: "medium",
      3: "low",
      4: "none",
    };
    const priorityText =
      issue.priority !== null && issue.priority !== undefined
        ? priorityLabels[issue.priority] || `P${issue.priority}`
        : null;

    // Sanitize fields
    const sanitizedTitle = TextSanitizer.sanitize(issue.title);
    const sanitizedDescription = issue.description ? TextSanitizer.sanitize(issue.description, 300) : null;

    const parts = [
      `Issue: "${sanitizedTitle}"`,
      issue.state ? `status: ${issue.state}` : null,
      priorityText ? `priority: ${priorityText}` : null,
      issue.teamName ? `team: ${issue.teamName}` : null,
      issue.assigneeName ? `assigned to ${issue.assigneeName}` : null,
      issue.projectName ? `project: ${issue.projectName}` : null,
      sanitizedDescription ? `${sanitizedDescription}` : null,
      issue.labels && issue.labels.length > 0 ? `labels: ${issue.labels.join(", ")}` : null,
      issue.createdAt
        ? `created ${new Date(issue.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
        : null,
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
