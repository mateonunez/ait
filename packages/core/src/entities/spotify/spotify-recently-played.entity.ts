import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import type { SpotifyRecentlyPlayedExternal } from "../../types/integrations";

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
  @Transform(({ value }: TransformFnParams) => value ?? null)
  album!: string | null;

  @Expose()
  durationMs!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  explicit!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  popularity!: number | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  playedAt!: Date;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  context!: { type: string; uri: string } | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  albumData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "spotify_recently_played" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): SpotifyRecentlyPlayedEntity {
    return plainToInstance(SpotifyRecentlyPlayedEntity, data, { excludeExtraneousValues: false });
  }
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
    artist: external.track?.artists?.map((a: any) => a.name).join(", ") ?? "",
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
    exposeDefaultValues: true,
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
