import "reflect-metadata";
import type { SpotifyAlbumExternal } from "@ait/core";
import type { SpotifyAlbumDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Spotify Album entity with class-transformer decorators.
 */
export class SpotifyAlbumEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  @Transform(({ value }) => value ?? "album")
  albumType!: string;

  @Expose()
  @Transform(({ value }) => value ?? [])
  artists!: string[];

  @Expose()
  @Transform(({ value }) => value ?? [])
  tracks!: string[];

  @Expose()
  @Transform(({ value }) => value ?? 0)
  totalTracks!: number;

  @Expose()
  @Transform(({ value }) => value ?? null)
  releaseDate!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  releaseDatePrecision!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? false)
  isPlayable!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? null)
  uri!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  href!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  popularity!: number | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  label!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? [])
  copyrights!: string[];

  @Expose()
  @Transform(({ value }) => value ?? [])
  externalIds!: string[];

  @Expose()
  @Transform(({ value }) => value ?? [])
  genres!: string[];

  @Expose()
  @Transform(({ value }) => value ?? null)
  images!: { url: string; height: number; width: number }[] | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "album" as const;
}

/**
 * Transform external Spotify API response to domain entity.
 */
export function mapSpotifyAlbum(external: SpotifyAlbumExternal): SpotifyAlbumEntity {
  const mapped = {
    ...external,
    albumType: external.album_type ?? "album",
    artists: Array.isArray(external.artists)
      ? external.artists.map((artist) => (typeof artist === "string" ? artist : artist.name || String(artist)))
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
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyAlbums(externals: SpotifyAlbumExternal[]): SpotifyAlbumEntity[] {
  return externals.map(mapSpotifyAlbum);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function spotifyAlbumDomainToDataTarget(domain: SpotifyAlbumEntity): SpotifyAlbumDataTarget {
  return instanceToPlain(domain) as SpotifyAlbumDataTarget;
}

export function spotifyAlbumDataTargetToDomain(dataTarget: SpotifyAlbumDataTarget): SpotifyAlbumEntity {
  return plainToInstance(SpotifyAlbumEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
