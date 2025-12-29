import { getLogger } from "@ait/core";
import { storageService } from "./storage.service";

const logger = getLogger();

export interface AssetDownloadOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class AssetService {
  public async downloadAndStore(
    url: string,
    bucket: string,
    key: string,
    contentType?: string,
    options?: AssetDownloadOptions,
  ): Promise<Buffer> {
    const { headers, timeoutMs = 30000 } = options || {};

    try {
      logger.debug(`Downloading asset from ${url}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Failed to download asset: ${res.status} ${res.statusText}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      logger.debug(`Uploading asset to ${bucket}/${key}`);
      await storageService.upload(bucket, key, buffer, contentType);

      return buffer;
    } catch (error) {
      logger.error(`Asset processing failed for ${url}`, { error });
      throw error;
    }
  }
}

export const assetService = new AssetService();
