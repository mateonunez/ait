import type { GitHubFileDataTarget } from "@ait/postgres";
import { CodeSanitizer } from "../../../../utils/code-sanitizer.util";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

/**
 * ETL Descriptor for GitHub repository files.
 * Generates LLM-friendly embedding text that captures file content
 * and key metadata for semantic code search.
 */
export class ETLGitHubFileDescriptor implements IETLEmbeddingDescriptor<GitHubFileDataTarget> {
  public getEmbeddingText(file: GitHubFileDataTarget): string {
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

    return parts.join("\n");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GitHubFileDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutUpdatedAt } = entity;
    const sanitizedContent = entity.content ? CodeSanitizer.sanitize(entity.content) : null;

    return {
      __type: "repository_file",
      ...entityWithoutUpdatedAt,
      content: sanitizedContent,
      title: CodeSanitizer.formatChunkTitle(entity.repositoryFullName || "unknown", entity.path || "unknown"),
    } as unknown as U;
  }
}

export const etlGitHubFileDescriptor = new ETLGitHubFileDescriptor();
