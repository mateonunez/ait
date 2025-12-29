import "reflect-metadata";
import type { SpotifyTrackExternal } from "@ait/core";
import type { SpotifyTrackDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Spotify Track entity with class-transformer decorators.
 */
export class SpotifyTrackEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

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
  isPlayable!: boolean | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  previewUrl!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  trackNumber!: number | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  discNumber!: number | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  uri!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  href!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? false)
  isLocal!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? null)
  popularity!: number | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  albumData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? [])
  artistsData!: Record<string, unknown>[];

  @Expose()
  @Transform(({ value }) => value ?? null)
  externalIds!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  externalUrls!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  addedAt!: Date | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "track" as const;
}

/**
 * Transform external Spotify API response to domain entity.
 */
export function mapSpotifyTrack(external: SpotifyTrackExternal): SpotifyTrackEntity {
  // Manual mapping for fields that are structured differently in external API
  const mapped = {
    ...external,
    artist: external.artists?.map((a) => a.name).join(", ") ?? "",
    album: external.album?.name ?? null,
    albumData: external.album ?? null,
    artistsData: external.artists ?? [],
    durationMs: external.duration_ms,
    isPlayable: external.is_playable,
    previewUrl: external.preview_url,
    trackNumber: external.track_number,
    discNumber: external.disc_number,
    isLocal: external.is_local,
    externalIds: external.external_ids,
    externalUrls: external.external_urls,
  };

  return plainToInstance(SpotifyTrackEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyTracks(externals: SpotifyTrackExternal[]): SpotifyTrackEntity[] {
  return externals.map(mapSpotifyTrack);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function spotifyTrackDomainToDataTarget(domain: SpotifyTrackEntity): SpotifyTrackDataTarget {
  return instanceToPlain(domain) as SpotifyTrackDataTarget;
}

export function spotifyTrackDataTargetToDomain(dataTarget: SpotifyTrackDataTarget): SpotifyTrackEntity {
  return plainToInstance(SpotifyTrackEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
