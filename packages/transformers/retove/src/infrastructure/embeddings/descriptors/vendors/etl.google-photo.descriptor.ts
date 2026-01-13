import { getAIDescriptorService } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import type { GooglePhotoDataTarget } from "@ait/postgres";
import { photoStorageService, storageService } from "@ait/storage";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();
const logger = getLogger();

export class ETLGooglePhotoDescriptor implements IETLEmbeddingDescriptor<GooglePhotoDataTarget> {
  public async enrich(photo: GooglePhotoDataTarget, options?: any): Promise<EnrichmentResult | null> {
    const correlationId = options?.correlationId;
    let localPath = photo.localPath;

    let storagePath = this._parseStoragePath(localPath);

    if (!storagePath && photo.baseUrl) {
      logger.info(`Photo ${photo.id} not found locally. Attempting on-demand download...`, { correlationId });
      const downloadResult = await photoStorageService.downloadAndStore({
        id: photo.id,
        baseUrl: photo.baseUrl,
        filename: photo.filename || undefined,
      });

      if (downloadResult.success && downloadResult.localPath) {
        localPath = downloadResult.localPath;
        storagePath = this._parseStoragePath(localPath);
      } else {
        logger.warn(`Failed to download photo ${photo.id} on-demand: ${downloadResult.error}`, { correlationId });
      }
    }

    if (storagePath) {
      try {
        const result = await storageService.get(storagePath.bucket, storagePath.key);
        if (result?.body) {
          logger.info(`Running vision AI enrichment for photo ${photo.id}`, { correlationId });
          return await aiDescriptor.describeImage(result.body, { correlationId });
        }
      } catch (error: any) {
        logger.error(`Vision AI enrichment failed for photo ${photo.id}`, {
          error: error.message,
          correlationId,
        });
      }
    }

    if (photo.description) {
      logger.info(`Running text AI enrichment for photo ${photo.id} (description fallback)`, { correlationId });
      return await aiDescriptor.describeText(photo.description, "Google Photo Description", {
        correlationId,
      });
    }

    logger.debug(`No enrichment possible for photo ${photo.id}`, { correlationId });
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
