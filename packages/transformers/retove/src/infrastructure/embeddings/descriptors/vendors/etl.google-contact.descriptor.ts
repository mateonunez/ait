import type { GoogleContactDataTarget } from "@ait/postgres";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLGoogleContactDescriptor implements IETLEmbeddingDescriptor<GoogleContactDataTarget> {
  public getEmbeddingText(contact: GoogleContactDataTarget): string {
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

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GoogleContactDataTarget): U {
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
