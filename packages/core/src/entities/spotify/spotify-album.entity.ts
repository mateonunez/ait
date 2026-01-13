import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { TransformFnParams } from "class-transformer";
import type { SpotifyAlbumExternal } from "../../types/integrations";

/**
 * Spotify Album entity with class-transformer decorators.
 */
export class SpotifyAlbumEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? "spotify_album")
  albumType!: string;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  artists!: string[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  tracks!: string[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? 0)
  totalTracks!: number;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  releaseDate!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  releaseDatePrecision!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? false)
  isPlayable!: boolean;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  uri!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  href!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  popularity!: number | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  label!: string | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  copyrights!: string[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  externalIds!: string[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? [])
  genres!: string[];

  @Expose()
  @Transform(({ value }: TransformFnParams) => value ?? null)
  images!: { url: string; height: number; width: number }[] | null;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: TransformFnParams) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "spotify_album" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): SpotifyAlbumEntity {
    return plainToInstance(SpotifyAlbumEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external Spotify API response to domain entity.
 */
export function mapSpotifyAlbum(external: SpotifyAlbumExternal): SpotifyAlbumEntity {
  const mapped = {
    ...external,
    albumType: external.album_type ?? "spotify_album",
    artists: Array.isArray(external.artists)
      ? external.artists.map((artist: any) => (typeof artist === "string" ? artist : artist.name || String(artist)))
      : [],
    tracks: external.tracks?.items
      ? external.tracks.items.map((track: any) => track.id || track.uri || String(track))
      : Array.isArray(external.tracks)
        ? (external.tracks as any[]).map((track: any) => track.id || track.uri || String(track))
        : [],
    totalTracks: external.total_tracks ?? 0,
    releaseDate: external.release_date ?? null,
    releaseDatePrecision: external.release_date_precision ?? null,
    isPlayable: Boolean(external.restrictions?.reason),
    copyrights: Array.isArray(external.copyrights)
      ? external.copyrights.map((c: any) => (typeof c === "string" ? c : JSON.stringify(c)))
      : [],
    externalIds: external.external_ids ? Object.values(external.external_ids).map(String) : [],
    genres: Array.isArray(external.genres) ? external.genres.map(String) : [],
  };

  return plainToInstance(SpotifyAlbumEntity, mapped, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyAlbums(externals: SpotifyAlbumExternal[]): SpotifyAlbumEntity[] {
  return externals.map(mapSpotifyAlbum);
}
