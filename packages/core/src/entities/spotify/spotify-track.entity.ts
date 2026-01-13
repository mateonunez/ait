import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import type { SpotifyTrackExternal } from "../../types/integrations";

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
  @Transform(({ value }: TransformFnParams) => value ?? null)
  album!: string | null;

  @Expose()
  durationMs!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  explicit!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  isPlayable!: boolean | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  previewUrl!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  trackNumber!: number | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  discNumber!: number | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  uri!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  href!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  isLocal!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  popularity!: number | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  albumData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  artistsData!: Record<string, unknown>[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  externalIds!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  externalUrls!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : null))
  addedAt!: Date | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "spotify_track" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): SpotifyTrackEntity {
    return plainToInstance(SpotifyTrackEntity, data, { excludeExtraneousValues: false });
  }
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
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyTracks(externals: SpotifyTrackExternal[]): SpotifyTrackEntity[] {
  return externals.map(mapSpotifyTrack);
}
