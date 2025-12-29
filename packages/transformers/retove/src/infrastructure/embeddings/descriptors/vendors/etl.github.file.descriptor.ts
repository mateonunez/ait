import { getAIDescriptorService } from "@ait/ai-sdk";
import type { GitHubFileDataTarget } from "@ait/postgres";
import { CodeSanitizer } from "../../../../utils/code-sanitizer.util";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

/**
 * ETL Descriptor for GitHub repository files.
 * Generates LLM-friendly embedding text that captures file content
 * and key metadata for semantic code search.
 */
export class ETLGitHubFileDescriptor implements IETLEmbeddingDescriptor<GitHubFileDataTarget> {
  public async enrich(file: GitHubFileDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const aiDescriptor = getAIDescriptorService();
    const context = `GitHub File: ${file.path} in ${file.repositoryFullName || "unknown repo"}`;

    const previewLength = 2000;
    const contentPreview = file.content ? file.content.substring(0, previewLength) : "No content";
    const content = `File Path: ${file.path}\nLanguage: ${file.language || "unknown"}\n\nContent Preview:\n${contentPreview}`;

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<GitHubFileDataTarget>): string {
    const { target: file, enrichment } = enriched;
    const parts: string[] = [];

    parts.push(`File: \`${file.path}\``);

    if (file.repositoryFullName) {
      parts.push(`Repository: ${file.repositoryFullName}`);
    }

    if (file.branch) {
      parts.push(`Branch: ${file.branch}`);
    }
    if (file.language) {
      parts.push(`Language: ${file.language}`);
    }

    if (file.linesOfCode && file.linesOfCode > 0) {
      parts.push(`Lines: ${file.linesOfCode}`);
    }

    if (file.extension) {
      parts.push(`Extension: ${file.extension}`);
    }

    parts.push("---");

    const maxContentLength = 10_000;
    const content = file.content || "";
    if (content.length > maxContentLength) {
      parts.push(CodeSanitizer.sanitizeForEmbedding(content.substring(0, maxContentLength)));
      parts.push(`... (truncated, ${file.linesOfCode} total lines)`);
    } else {
      parts.push(CodeSanitizer.sanitizeForEmbedding(content));
    }

    const baseText = parts.join("\n");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<GitHubFileDataTarget>): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutUpdatedAt } = entity;
    const sanitizedContent = entity.content ? CodeSanitizer.sanitize(entity.content) : null;

    return {
      __type: "github_file",
      ...entityWithoutUpdatedAt,
      content: sanitizedContent,
      title: CodeSanitizer.formatChunkTitle(entity.repositoryFullName || "unknown", entity.path || "unknown"),
    } as unknown as U;
  }
}

export const etlGitHubFileDescriptor = new ETLGitHubFileDescriptor();
