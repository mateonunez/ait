import "reflect-metadata";
import type { SpotifyRecentlyPlayedExternal } from "@ait/core";
import type { SpotifyRecentlyPlayedDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Spotify Recently Played entity with class-transformer decorators.
 */
export class SpotifyRecentlyPlayedEntity {
  @Expose()
  id!: string;

  @Expose()
  trackId!: string;

  @Expose()
  trackName!: string;

  @Expose()
  artist!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  album!: string | null;

  @Expose()
  durationMs!: number;

  @Expose()
  @Transform(({ value }) => value ?? false)
  explicit!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? null)
  popularity!: number | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  playedAt!: Date;

  @Expose()
  @Transform(({ value }) => value ?? null)
  context!: { type: string; uri: string } | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  albumData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "recently_played" as const;
}

/**
 * Transform external Spotify API response to domain entity.
 */
export function mapSpotifyRecentlyPlayed(external: SpotifyRecentlyPlayedExternal): SpotifyRecentlyPlayedEntity {
  const mapped = {
    ...external,
    id: `${external.track?.id ?? ""}-${external.played_at ?? ""}`,
    trackId: external.track?.id ?? "",
    trackName: external.track?.name ?? "",
    artist: external.track?.artists?.map((a) => a.name).join(", ") ?? "",
    album: external.track?.album?.name ?? null,
    durationMs: external.track?.duration_ms ?? 0,
    explicit: external.track?.explicit ?? false,
    popularity: external.track?.popularity ?? null,
    playedAt: external.played_at ? new Date(external.played_at) : new Date(),
    context: external.context
      ? {
          type: external.context.type ?? "",
          uri: external.context.uri ?? "",
        }
      : null,
    albumData: external.track?.album
      ? {
          name: external.track.album.name,
          images: external.track.album.images,
          id: external.track.album.id,
          uri: external.track.album.uri,
          href: external.track.album.href,
          release_date: external.track.album.release_date,
          total_tracks: external.track.album.total_tracks,
        }
      : null,
  };

  return plainToInstance(SpotifyRecentlyPlayedEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyRecentlyPlayedItems(
  externals: SpotifyRecentlyPlayedExternal[],
): SpotifyRecentlyPlayedEntity[] {
  return externals.map(mapSpotifyRecentlyPlayed);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function spotifyRecentlyPlayedDomainToDataTarget(
  domain: SpotifyRecentlyPlayedEntity,
): SpotifyRecentlyPlayedDataTarget {
  return instanceToPlain(domain) as SpotifyRecentlyPlayedDataTarget;
}

export function spotifyRecentlyPlayedDataTargetToDomain(
  dataTarget: SpotifyRecentlyPlayedDataTarget,
): SpotifyRecentlyPlayedEntity {
  return plainToInstance(SpotifyRecentlyPlayedEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
