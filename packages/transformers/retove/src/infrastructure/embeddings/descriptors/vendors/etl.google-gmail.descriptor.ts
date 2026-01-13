import { getAIDescriptorService } from "@ait/ai-sdk";
import type { GoogleGmailMessageDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLGmailMessageDescriptor implements IETLEmbeddingDescriptor<GoogleGmailMessageDataTarget> {
  public async enrich(message: GoogleGmailMessageDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const context = `Gmail Message: ${message.subject}`;

    let body = message.snippet || "";
    if (message.payload && typeof message.payload === "object" && "bodySnippet" in message.payload) {
      body = (message.payload as any).bodySnippet || body;
    }

    const content = [
      message.subject ? `Subject: ${message.subject}` : null,
      message.from ? `From: ${message.from}` : null,
      message.to ? `To: ${message.to}` : null,
      `Body: ${body}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (!content) return null;

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<GoogleGmailMessageDataTarget>): string {
    const { target: message, enrichment } = enriched;
    const parts: string[] = [];

    parts.push("Gmail message");

    if (message.subject) {
      const sanitizedSubject = TextSanitizer.sanitize(message.subject);
      parts.push(`subject: "${sanitizedSubject}"`);
    }

    if (message.from) {
      parts.push(`from ${TextSanitizer.sanitize(message.from)}`);
    }

    if (message.to) {
      parts.push(`to ${TextSanitizer.sanitize(message.to)}`);
    }

    if (message.internalDate) {
      const date = new Date(Number.parseInt(message.internalDate));
      parts.push(`sent on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`);
    }

    let body = message.snippet || "";
    if (message.payload && typeof message.payload === "object" && "bodySnippet" in message.payload) {
      // Prefer bodySnippet if available as it might be longer/better than snippet
      const bs = (message.payload as any).bodySnippet;
      if (bs) body = bs;
    }

    if (body) {
      const sanitizedBody = TextSanitizer.sanitize(body, 1000); // Limit length
      parts.push(`content: "${sanitizedBody}"`);
    }

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(
    enriched: EnrichedEntity<GoogleGmailMessageDataTarget>,
  ): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    let body = entity.snippet || "";
    if (entity.payload && typeof entity.payload === "object" && "bodySnippet" in entity.payload) {
      const bs = (entity.payload as any).bodySnippet;
      if (bs) body = bs;
    }

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      subject: entity.subject ? TextSanitizer.sanitize(entity.subject, 500) : null,
      snippet: entity.snippet ? TextSanitizer.sanitize(entity.snippet, 500) : null,
      body: body ? TextSanitizer.sanitize(body, 2000) : null,
    };

    return {
      __type: "gmail_message",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const googleGmailDescriptorsETL = {
  message: new ETLGmailMessageDescriptor(),
};
