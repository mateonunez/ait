import { getLogger } from "@ait/core";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import * as dotenv from "dotenv";

dotenv.config();

const logger = getLogger();

export interface IStorageService {
  upload(bucket: string, key: string, body: Buffer | Uint8Array | Blob | string, contentType?: string): Promise<void>;
  get(bucket: string, key: string): Promise<{ body: Buffer; contentType?: string } | null>;
  generatePresignedUrl(bucket: string, key: string, expiresIn?: number): Promise<string>;
}

export class StorageService implements IStorageService {
  private readonly _client: S3Client;
  private readonly _existingBuckets = new Set<string>();

  constructor() {
    this._client = new S3Client({
      region: process.env.MINIO_REGION || "us-east-1",
      endpoint: process.env.MINIO_ENDPOINT || "http://127.0.0.1:9000",
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || "minio",
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || "miniosecret",
      },
      forcePathStyle: true, // Required for Minio
    });
  }

  private async ensureBucketExists(bucket: string): Promise<void> {
    if (this._existingBuckets.has(bucket)) return;

    try {
      await this._client.send(new HeadBucketCommand({ Bucket: bucket }));
      this._existingBuckets.add(bucket);
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        logger.info(`Creating bucket: ${bucket}`);
        await this._client.send(new CreateBucketCommand({ Bucket: bucket }));
        this._existingBuckets.add(bucket);
      } else {
        throw error;
      }
    }
  }

  public async upload(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | Blob | string,
    contentType?: string,
  ): Promise<void> {
    try {
      await this.ensureBucketExists(bucket);

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await this._client.send(command);
      logger.info(`Successfully uploaded to ${bucket}/${key}`);
    } catch (error) {
      logger.error(`Failed to upload to ${bucket}/${key}`, { error });
      throw error;
    }
  }

  public async get(bucket: string, key: string): Promise<{ body: Buffer; contentType?: string } | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await this._client.send(command);
      if (!response.Body) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);

      return {
        body,
        contentType: response.ContentType,
      };
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      logger.error(`Failed to get ${bucket}/${key}`, { error });
      throw error;
    }
  }

  // Placeholder for presigned URL generation if needed later
  public async generatePresignedUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
    // Note: Implementation usually involves @aws-sdk/s3-request-presigner
    throw new Error("Method not implemented.");
  }
}

export const storageService = new StorageService();
