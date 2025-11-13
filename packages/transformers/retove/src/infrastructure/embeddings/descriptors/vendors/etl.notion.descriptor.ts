import type { NotionPageDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";

export class ETLNotionPageDescriptor implements IETLEmbeddingDescriptor<NotionPageDataTarget> {
  public getEmbeddingText(page: NotionPageDataTarget): string {
    const parts: string[] = [];

    // Title is always present
    const sanitizedTitle = TextSanitizer.sanitize(page.title);
    parts.push(sanitizedTitle);

    // Add parent context if available
    if (page.parentType && page.parentType !== "workspace") {
      parts.push(`in ${page.parentType}`);
    }

    // Add content if available (this is the main text content from blocks)
    if (page.content) {
      const sanitizedContent = TextSanitizer.sanitize(page.content);
      // Limit content length to avoid overwhelming the embedding
      const contentPreview = sanitizedContent.length > 500 ? `${sanitizedContent.slice(0, 500)}...` : sanitizedContent;
      parts.push(contentPreview);
    }

    // Add archived status
    if (page.archived) {
      parts.push("archived");
    }

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: NotionPageDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      title: TextSanitizer.sanitize(entityWithoutInternalTimestamps.title, 500),
      content: entityWithoutInternalTimestamps.content
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.content, 2000)
        : null,
    };

    return {
      __type: "page",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const notionDescriptorsETL = {
  page: new ETLNotionPageDescriptor(),
};
