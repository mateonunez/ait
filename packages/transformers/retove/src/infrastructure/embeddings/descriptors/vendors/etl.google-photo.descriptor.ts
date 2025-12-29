import type { GooglePhotoDataTarget } from "@ait/postgres";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLGooglePhotoDescriptor implements IETLEmbeddingDescriptor<GooglePhotoDataTarget> {
  public getEmbeddingText(photo: GooglePhotoDataTarget): string {
    const parts: string[] = [];

    parts.push("Google Photo");

    if (photo.filename) {
      parts.push(`Filename: ${TextSanitizer.sanitize(photo.filename)}`);
    }

    if (photo.description) {
      parts.push(`Description: ${TextSanitizer.sanitize(photo.description)}`);
    }

    if (photo.creationTime) {
      const date = photo.creationTime instanceof Date ? photo.creationTime : new Date(photo.creationTime);
      parts.push(`Created: ${date.toISOString()}`);
    }

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GooglePhotoDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      filename: entityWithoutInternalTimestamps.filename
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.filename, 500)
        : "Unknown Filename",
      description: entityWithoutInternalTimestamps.description
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.description, 2000)
        : null,
    };

    return {
      __type: "google_photo",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const googlePhotoDescriptorsETL = {
  photo: new ETLGooglePhotoDescriptor(),
};
