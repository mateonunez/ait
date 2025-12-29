import { getAIDescriptorService } from "@ait/ai-sdk";
import type { NotionPageDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLNotionPageDescriptor implements IETLEmbeddingDescriptor<NotionPageDataTarget> {
  public async enrich(page: NotionPageDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const context = `Notion Page: ${page.title}`;
    const content = page.content || "Empty page";

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<NotionPageDataTarget>): string {
    const { target: page, enrichment } = enriched;
    const parts: string[] = [];

    // Page identity - factual description
    const sanitizedTitle = TextSanitizer.sanitize(page.title);
    parts.push(`Notion page: "${sanitizedTitle}"`);

    // Add parent context if available
    if (page.parentType && page.parentType !== "workspace") {
      parts.push(`in ${page.parentType}`);
    }

    // Add content if available (this is the main text content from blocks)
    if (page.content) {
      const sanitizedContent = TextSanitizer.sanitize(page.content);
      const contentPreview = sanitizedContent.length > 500 ? `${sanitizedContent.slice(0, 500)}...` : sanitizedContent;
      parts.push(contentPreview);
    }

    // Add archived status
    if (page.archived) {
      parts.push("(archived)");
    }

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<NotionPageDataTarget>): U {
    const { target: entity } = enriched;
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
