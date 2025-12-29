import { getCollectionNameByVendor } from "@ait/ai-sdk";
import type { IEmbeddingsService } from "@ait/ai-sdk";
import type { EntityType } from "@ait/core";
import { getLogger } from "@ait/core";
import { type GooglePhotoDataTarget, drizzleOrm, type getPostgresClient, googlePhotos } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { storageService } from "@ait/storage";
import type { IETLEmbeddingDescriptor } from "../../infrastructure/embeddings/descriptors/etl.embedding.descriptor.interface";
import { ETLGooglePhotoDescriptor } from "../../infrastructure/embeddings/descriptors/vendors/etl.google-photo.descriptor";
import {
  type BaseVectorPoint,
  type ETLCursor,
  type ETLTableConfig,
  RetoveBaseETLAbstract,
  type RetryOptions,
} from "../retove.base-etl.abstract";

export class RetoveGooglePhotoETL extends RetoveBaseETLAbstract {
  private readonly _descriptor: IETLEmbeddingDescriptor<GooglePhotoDataTarget> = new ETLGooglePhotoDescriptor();
  private readonly _logger = getLogger();

  constructor(
    pgClient: ReturnType<typeof getPostgresClient>,
    qdrantClient: qdrant.QdrantClient,
    retryOptions?: RetryOptions,
    embeddingsService?: IEmbeddingsService,
  ) {
    super(pgClient, qdrantClient, getCollectionNameByVendor("google"), retryOptions, embeddingsService);
  }

  protected async extract(limit: number, cursor?: ETLCursor): Promise<GooglePhotoDataTarget[]> {
    return await this._pgClient.db.transaction(async (tx) => {
      let query = tx.select().from(googlePhotos) as any;

      if (cursor) {
        query = query.where(
          drizzleOrm.and(
            drizzleOrm.gte(googlePhotos.updatedAt, cursor.timestamp),
            drizzleOrm.gt(googlePhotos.id, cursor.id),
          ),
        );
      }

      return query
        .orderBy(drizzleOrm.asc(googlePhotos.updatedAt), drizzleOrm.asc(googlePhotos.id))
        .limit(limit)
        .execute();
    });
  }

  protected override async _transformSingleEntity(
    item: Record<string, unknown>,
    index: number,
  ): Promise<BaseVectorPoint> {
    const photo = item as GooglePhotoDataTarget;
    const entityId = String(photo.id);
    const correlationId = `retove-google-${entityId}`;

    // 1. Get image from existing MinIO storage (already downloaded by Picker import)
    let buffer: Buffer | undefined;
    if (photo.localPath) {
      const [bucket, ...keyParts] = photo.localPath.split("/");
      const key = keyParts.join("/");
      try {
        const result = await storageService.get(bucket, key);
        buffer = result?.body;
      } catch (err) {
        this._logger.warn(`Failed to get image from storage for ${photo.id}: ${err}`);
      }
    }

    // 2. Generate embeddings
    let vector: number[];
    let aiDescription: string | undefined;
    const text = this.getTextForEmbedding(photo);

    if (buffer) {
      // Generate image embeddings using the existing image from MinIO
      try {
        const result = await this._embeddingsService.generateImageEmbeddings(buffer, { correlationId });
        vector = result.vector;
        aiDescription = result.description;
      } catch (err) {
        this._logger.error(`Failed to generate image embedding for ${photo.id}: ${err}`);
        // Fallback to text-only embedding
        vector = await this._embeddingsService.generateEmbeddings(text, { correlationId });
      }
    } else {
      // No image available - use text-only embedding
      this._logger.info(`No stored image for ${photo.id}, using text-only embedding`);
      vector = await this._embeddingsService.generateEmbeddings(text, { correlationId });
    }

    // 3. Construct Point
    const sparseVector = this._enableHybridSearch ? this._sparseVectorService.generateSparseVector(text) : undefined;

    const payloadObj = this.getPayload(photo);
    const pointId = this._generateDeterministicId(this._collectionName, entityId);

    const enrichedText = aiDescription ? `${text}\n\nAI Description: ${aiDescription}` : text;

    return {
      id: pointId,
      vector,
      sparseVector,
      payload: {
        content: enrichedText,
        metadata: {
          ...payloadObj,
          description: payloadObj.description || aiDescription,
          id: entityId,
          __source: "retove",
          __type: "google_photo",
          __collection: this._collectionName,
          __indexed_at: new Date().toISOString(),
          storage_key: photo.localPath || undefined,
          ai_description: aiDescription,
        },
      },
    };
  }

  protected override _getTableConfig(): ETLTableConfig | null {
    return {
      table: googlePhotos,
      updatedAtField: googlePhotos.updatedAt,
      idField: googlePhotos.id,
    };
  }

  protected getTextForEmbedding(photo: GooglePhotoDataTarget): string {
    return this._descriptor.getEmbeddingText(photo);
  }

  protected getPayload(photo: GooglePhotoDataTarget): RetoveGooglePhotoVectorPoint["payload"] {
    return this._descriptor.getEmbeddingPayload(photo);
  }

  protected getCursorFromItem(item: unknown): ETLCursor {
    const photo = item as GooglePhotoDataTarget;
    return {
      timestamp: photo.updatedAt ? new Date(photo.updatedAt) : new Date(0),
      id: photo.id,
    };
  }

  protected override _getCollectionSpecificIndexes() {
    return [
      { field_name: "metadata.filename", field_schema: "text" as const },
      { field_name: "metadata.description", field_schema: "text" as const },
    ];
  }

  protected override _getEntityType(): EntityType {
    return "google_photo";
  }
}

export interface RetoveGooglePhotoVectorPoint extends BaseVectorPoint {
  payload: {
    __type: "google_photo";
  } & Partial<GooglePhotoDataTarget>;
}
