import { getLogger } from "@ait/core";
import { STORAGE_BUCKETS, type StorageBucket } from "./constants";
import { storageService } from "./storage.service";

const logger = getLogger();

export interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

export interface PhotoDownloadOptions {
  id: string;
  baseUrl: string;
  filename?: string;
  mimeType?: string;
  bucket?: StorageBucket;
  accessToken?: string;
}

export interface IPhotoStorageService {
  downloadAndStore(options: PhotoDownloadOptions): Promise<DownloadResult>;
  downloadBatch(items: PhotoDownloadOptions[], concurrency?: number): Promise<Map<string, DownloadResult>>;
}

export class PhotoStorageService implements IPhotoStorageService {
  async downloadAndStore(options: PhotoDownloadOptions): Promise<DownloadResult> {
    const {
      id,
      baseUrl,
      filename = `${id}.jpg`,
      mimeType = "image/jpeg",
      bucket = STORAGE_BUCKETS.PHOTOS,
      accessToken,
    } = options;

    try {
      const downloadUrl = `${baseUrl}=d`;
      logger.info(`Downloading photo from: ${downloadUrl}`);

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(downloadUrl, { headers });
      if (!response.ok) {
        const error = `Failed to download: ${response.status} ${response.statusText}`;
        logger.warn(`Failed to download photo ${id}: ${error}`);
        return { success: false, error };
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const storagePath = `${id}/${filename}`;
      await storageService.upload(bucket, storagePath, buffer, mimeType);

      const localPath = `${bucket}/${storagePath}`;
      logger.info(`Successfully stored photo at: ${localPath}`);

      return { success: true, localPath };
    } catch (error: any) {
      logger.error(`Error downloading photo ${id}`, { error });
      return { success: false, error: error.message };
    }
  }

  async downloadBatch(items: PhotoDownloadOptions[], concurrency = 3): Promise<Map<string, DownloadResult>> {
    const results = new Map<string, DownloadResult>();

    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map((item) => this.downloadAndStore(item)));

      batch.forEach((item, index) => {
        results.set(item.id, batchResults[index]!);
      });
    }

    return results;
  }
}

export const photoStorageService = new PhotoStorageService();
