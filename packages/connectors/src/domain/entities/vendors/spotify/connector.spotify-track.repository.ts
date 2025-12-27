import { randomUUID } from "node:crypto";
import { AItError, type PaginatedResponse, type PaginationParams } from "@ait/core";
import { getLogger } from "@ait/core";
import { type SpotifyTrackDataTarget, drizzleOrm, getPostgresClient, spotifyTracks } from "@ait/postgres";
import type { IConnectorRepositorySaveOptions } from "../../../../types/domain/entities/connector.repository.interface";
import type { IConnectorSpotifyTrackRepository } from "../../../../types/domain/entities/vendors/connector.spotify.types";
import { spotifyTrackDataTargetToDomain, spotifyTrackDomainToDataTarget } from "../../spotify/spotify-track.entity";
import type { SpotifyTrackEntity } from "../../spotify/spotify-track.entity";

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
      const trackDataTarget = spotifyTrackDomainToDataTarget(track);
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
          albumData: trackDataTarget.albumData,
          artistsData: trackDataTarget.artistsData,
          externalIds: trackDataTarget.externalIds,
          externalUrls: trackDataTarget.externalUrls,
          addedAt: trackDataTarget.addedAt,
          updatedAt: new Date(),
        };

        await tx
          .insert(spotifyTracks)
          .values(trackDataTarget)
          .onConflictDoUpdate({
            target: spotifyTracks.id,
            set: updateValues,
          })
          .execute();
      });
    } catch (error: any) {
      logger.error("Failed to save track:", { trackId: track.id, error });
      throw new AItError(
        "SPOTIFY_SAVE_TRACK",
        `Failed to save track ${track.id}: ${error.message}`,
        { id: track.id },
        error,
      );
    }
  }

  async saveTracks(tracks: SpotifyTrackEntity[]): Promise<void> {
    if (!tracks.length) {
      return;
    }

    try {
      logger.debug("Saving tracks to Spotify repository:", { tracks });

      for (const track of tracks) {
        await this.saveTrack(track, { incremental: false });
      }
    } catch (error) {
      logger.error("Error saving tracks:", { error });
      throw new AItError("SPOTIFY_SAVE_TRACK_BULK", "Failed to save tracks to repository");
    }
  }

  async getTrack(id: string): Promise<SpotifyTrackEntity | null> {
    logger.info("Getting track from Spotify repository", { id });
    return null;
  }

  async fetchTracks(): Promise<SpotifyTrackEntity[]> {
    logger.info("Getting tracks from Spotify repository");
    return [];
  }

  async getTracksPaginated(params: PaginationParams): Promise<PaginatedResponse<SpotifyTrackEntity>> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const [tracks, totalResult] = await Promise.all([
      this._pgClient.db
        .select()
        .from(spotifyTracks)
        .orderBy(drizzleOrm.desc(spotifyTracks.addedAt))
        .limit(limit)
        .offset(offset),
      this._pgClient.db.select({ count: drizzleOrm.count() }).from(spotifyTracks),
    ]);

    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: tracks.map((track) => spotifyTrackDataTargetToDomain(track as SpotifyTrackDataTarget)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
