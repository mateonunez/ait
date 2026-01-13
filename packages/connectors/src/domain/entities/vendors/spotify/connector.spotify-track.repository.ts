import { randomUUID } from "node:crypto";
import {
  AItError,
  type PaginatedResponse,
  type PaginationParams,
  SpotifyTrackEntity,
  buildPaginatedResponse,
  getErrorMessage,
  getLogger,
  getPaginationOffset,
} from "@ait/core";
import { type SpotifyTrackDataTarget, drizzleOrm, getPostgresClient, spotifyTracks } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyTrackRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";

const logger = getLogger();

export class ConnectorSpotifyTrackRepository implements IConnectorSpotifyTrackRepository {
  private _pgClient = getPostgresClient();

  async saveTrack(
    track: SpotifyTrackEntity,
    options: IConnectorRepositorySaveOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const trackId = incremental ? randomUUID() : track.id;

    try {
      const trackDataTarget = track.toPlain<SpotifyTrackDataTarget>();
      trackDataTarget.id = trackId;

      await this._pgClient.db.transaction(async (tx) => {
        const updateValues: Partial<SpotifyTrackDataTarget> = {
          name: trackDataTarget.name,
          artist: trackDataTarget.artist,
          album: trackDataTarget.album,
          durationMs: trackDataTarget.durationMs,
          explicit: trackDataTarget.explicit,
          isPlayable: trackDataTarget.isPlayable,
          previewUrl: trackDataTarget.previewUrl,
          trackNumber: trackDataTarget.trackNumber,
          discNumber: trackDataTarget.discNumber,
          uri: trackDataTarget.uri,
          href: trackDataTarget.href,
          isLocal: trackDataTarget.isLocal,
          popularity: trackDataTarget.popularity,
          albumData: trackDataTarget.albumData as any,
          artistsData: trackDataTarget.artistsData as any,
          externalIds: trackDataTarget.externalIds as any,
          externalUrls: trackDataTarget.externalUrls as any,
          addedAt: trackDataTarget.addedAt,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyTracks)
          .values(trackDataTarget as any)
          .onConflictDoUpdate({
            target: spotifyTracks.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: unknown) {
      logger.error("Failed to save track:", { trackId: track.id, error });
      throw new AItError(
        "SPOTIFY_SAVE_TRACK",
        `Failed to save track ${track.id}: ${getErrorMessage(error)}`,
        { id: track.id },
        error instanceof Error ? error : undefined,
      );
    }
  }

  async saveTracks(tracks: SpotifyTrackEntity[]): Promise<void> {
    if (!tracks.length) {
      return;
    }

    try {
      for (const track of tracks) {
        await this.saveTrack(track, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving tracks:", { error });
      throw new AItError("SPOTIFY_SAVE_TRACK_BULK", "Failed to save tracks to repository");
    }
  }

  async getTrack(id: string): Promise<SpotifyTrackEntity | null> {
    const result = await this._pgClient.db
      .select()
      .from(spotifyTracks)
      .where(drizzleOrm.eq(spotifyTracks.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return SpotifyTrackEntity.fromPlain(result[0]! as SpotifyTrackDataTarget);
  }

  async fetchTracks(): Promise<SpotifyTrackEntity[]> {
    const tracks = await this._pgClient.db.select().from(spotifyTracks);
    return tracks.map((track) => SpotifyTrackEntity.fromPlain(track as SpotifyTrackDataTarget));
  }

  async getTracksPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyTrackEntity>> {
    const { limit, offset } = getPaginationOffset(params);

    const [tracks, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyTracks)
        .orderBy(drizzleOrm.desc(spotifyTracks.addedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyTracks),
    ]);

    return buildPaginatedResponse(
      tracks.map((track) => SpotifyTrackEntity.fromPlain(track as SpotifyTrackDataTarget)),
      params,
      totalResult[0]?.count || 0,
    );
  }
}
