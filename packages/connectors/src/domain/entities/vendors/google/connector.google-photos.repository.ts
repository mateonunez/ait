import {
  AItError,
  GooglePhotoEntity,
  type PaginatedResponse,
  type PaginationParams,
  buildPaginatedResponse,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type GooglePhotoDataTarget, drizzleOrm, getPostgresClient, googlePhotos } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorGooglePhotoRepository } from "../../../../types/domain/entities/vendors/connector.google.types";

const logger = getLogger();

export class ConnectorGooglePhotoRepository implements IConnectorGooglePhotoRepository {
  private _pgClient = getPostgresClient();

  async savePhoto(
    photo: GooglePhotoEntity,
    _options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    try {
      const dataTarget = photo.toPlain<GooglePhotoDataTarget>();

      // Fix: id/primary key conflict
      await this._pgClient.db
        .insert(googlePhotos)
        .values(dataTarget)
        .onConflictDoUpdate({
          target: googlePhotos.id,
          set: dataTarget,
        })
        .execute();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("Failed to save Google Photo:", { photoId: photo.id, error: message });
      throw new AItError("GOOGLE_PHOTO_SAVE", `Failed to save photo ${photo.id}: ${message}`, { id: photo.id }, error);
    }
  }

  async savePhotos(photos: GooglePhotoEntity[]): Promise<void> {
    if (!photos.length) return;
    try {
      for (const photo of photos) {
        await this.savePhoto(photo);
      }
    } catch (error) {
      logger.error("Error saving photos:", { error });
      throw new AItError("GOOGLE_PHOTO_SAVE_BULK", "Failed to save photos to repository");
    }
  }

  async getPhoto(id: string): Promise<GooglePhotoEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(googlePhotos)
      .where(drizzleOrm.eq(googlePhotos.id, id))
      .limit(1);

    if (result.length === 0) return null;
    return GooglePhotoEntity.fromPlain(result[0] as GooglePhotoDataTarget);
  }

  async fetchPhotos(): Promise<GooglePhotoEntity[]> {
    const photos = await this._pgClient.db
      .select()
      .from(googlePhotos)
      .orderBy(drizzleOrm.desc(googlePhotos.creationTime));

    return photos.map((p) => GooglePhotoEntity.fromPlain(p as GooglePhotoDataTarget));
  }

  async getPhotosPaginated(params: PaginationParams): Promise<PaginatedResponse<GooglePhotoEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [photos, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(googlePhotos)
        .orderBy(drizzleOrm.desc(googlePhotos.creationTime))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(googlePhotos),
    ]);

    return buildPaginatedResponse(
      photos.map((p) => GooglePhotoEntity.fromPlain(p as GooglePhotoDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
