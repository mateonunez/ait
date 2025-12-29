import { getAIDescriptorService } from "@ait/ai-sdk";
import type { LinearIssueDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLLinearIssueDescriptor implements IETLEmbeddingDescriptor<LinearIssueDataTarget> {
  public async enrich(issue: LinearIssueDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const context = `Linear Issue: ${issue.title}`;
    const content = [
      `Status: ${issue.state}`,
      `Priority: ${issue.priority}`,
      issue.description ? `Description: ${issue.description}` : null,
      issue.labels?.length ? `Labels: ${issue.labels.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<LinearIssueDataTarget>): string {
    const { target: issue, enrichment } = enriched;
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

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<LinearIssueDataTarget>): U {
    const { target: entity } = enriched;
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
