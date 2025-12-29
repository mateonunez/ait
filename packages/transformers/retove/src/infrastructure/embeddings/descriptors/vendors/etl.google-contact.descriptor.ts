import { getAIDescriptorService } from "@ait/ai-sdk";
import type { GoogleContactDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLGoogleContactDescriptor implements IETLEmbeddingDescriptor<GoogleContactDataTarget> {
  public async enrich(contact: GoogleContactDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const context = `Google Contact: ${contact.displayName}`;
    const content = [
      contact.organization
        ? `Organization: ${contact.organization}${contact.jobTitle ? ` (${contact.jobTitle})` : ""}`
        : null,
      contact.biography ? `Notes: ${contact.biography}` : null,
      contact.email ? `Email: ${contact.email}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (!content) return null;

    return aiDescriptor.describeText(content, context, { correlationId: options?.correlationId });
  }

  public getEmbeddingText(enriched: EnrichedEntity<GoogleContactDataTarget>): string {
    const { target: contact, enrichment } = enriched;
    const parts: string[] = [];

    parts.push("Google Contact");

    if (contact.displayName) {
      parts.push(TextSanitizer.sanitize(contact.displayName));
    }

    if (contact.email) {
      parts.push(`Email: ${contact.email}`);
    }

    if (contact.phoneNumber) {
      parts.push(`Phone: ${contact.phoneNumber}`);
    }

    if (contact.organization) {
      const org = TextSanitizer.sanitize(contact.organization);
      const title = contact.jobTitle ? ` (${TextSanitizer.sanitize(contact.jobTitle)})` : "";
      parts.push(`Organization: ${org}${title}`);
    }

    if (contact.biography) {
      const sanitizedBio = TextSanitizer.sanitize(contact.biography);
      const bioPreview = sanitizedBio.length > 500 ? `${sanitizedBio.slice(0, 500)}...` : sanitizedBio;
      parts.push(`Notes: ${bioPreview}`);
    }

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<GoogleContactDataTarget>): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      displayName: entityWithoutInternalTimestamps.displayName
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.displayName, 500)
        : "Unknown Contact",
      biography: entityWithoutInternalTimestamps.biography
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.biography, 2000)
        : null,
    };

    return {
      __type: "google_contact",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const googleContactDescriptorsETL = {
  contact: new ETLGoogleContactDescriptor(),
};
