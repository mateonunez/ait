import type { GitHubFileDataTarget } from "@ait/postgres";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

/**
 * ETL Descriptor for GitHub repository files.
 * Generates LLM-friendly embedding text that captures file content
 * and key metadata for semantic code search.
 */
export class ETLGitHubFileDescriptor implements IETLEmbeddingDescriptor<GitHubFileDataTarget> {
  public getEmbeddingText(file: GitHubFileDataTarget): string {
    const parts: string[] = [];

    // File identity with path
    parts.push(`File: \`${file.path}\``);

    // Repository context
    if (file.repositoryFullName) {
      parts.push(`Repository: ${file.repositoryFullName}`);
    }

    // Branch context
    if (file.branch) {
      parts.push(`Branch: ${file.branch}`);
    }

    // Language and metadata
    if (file.language) {
      parts.push(`Language: ${file.language}`);
    }

    if (file.linesOfCode && file.linesOfCode > 0) {
      parts.push(`Lines: ${file.linesOfCode}`);
    }

    if (file.extension) {
      parts.push(`Extension: ${file.extension}`);
    }

    // Separator before content
    parts.push("---");

    // Include file content for semantic search
    // Truncate very large files to avoid embedding size limits
    const maxContentLength = 10_000;
    const content = file.content || "";
    if (content.length > maxContentLength) {
      parts.push(TextSanitizer.sanitize(content.substring(0, maxContentLength), maxContentLength));
      parts.push(`... (truncated, ${file.linesOfCode} total lines)`);
    } else {
      parts.push(TextSanitizer.sanitize(content, maxContentLength));
    }

    return parts.join("\n");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GitHubFileDataTarget): U {
    // Exclude the content from payload to reduce storage size
    // (content is included in embedding text)
    const { content: _content, updatedAt: _updatedAt, ...entityWithoutContent } = entity;

    return {
      __type: "repository_file",
      ...entityWithoutContent,
      // Include truncated content summary for display purposes
      contentPreview: entity.content?.substring(0, 1_000) || null,
    } as unknown as U;
  }
}

export const etlGitHubFileDescriptor = new ETLGitHubFileDescriptor();
