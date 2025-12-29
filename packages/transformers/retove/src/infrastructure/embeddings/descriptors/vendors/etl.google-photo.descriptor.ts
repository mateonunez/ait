import { getAIDescriptorService } from "@ait/ai-sdk";
import type { GooglePhotoDataTarget } from "@ait/postgres";
import { storageService } from "@ait/storage";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLGooglePhotoDescriptor implements IETLEmbeddingDescriptor<GooglePhotoDataTarget> {
  public async enrich(photo: GooglePhotoDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const storagePath = this._parseStoragePath(photo.localPath);
    if (storagePath) {
      try {
        const result = await storageService.get(storagePath.bucket, storagePath.key);
        if (result?.body) {
          return await aiDescriptor.describeImage(result.body, { correlationId: options?.correlationId });
        }
      } catch (error) {
        // Fallback to text enrichment if vision fails
      }
    }

    if (photo.description) {
      return await aiDescriptor.describeText(photo.description, "Google Photo Description", {
        correlationId: options?.correlationId,
      });
    }

    return null;
  }

  private _parseStoragePath(localPath: string | null | undefined): { bucket: string; key: string } | null {
    if (!localPath?.includes("/")) return null;

    const [bucket, ...keyParts] = localPath.split("/");
    const key = keyParts.join("/");

    return bucket && key ? { bucket, key } : null;
  }

  public getEmbeddingText(enriched: EnrichedEntity<GooglePhotoDataTarget>): string {
    const { target: photo, enrichment } = enriched;
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

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<GooglePhotoDataTarget>): U {
    const { target: entity } = enriched;
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
