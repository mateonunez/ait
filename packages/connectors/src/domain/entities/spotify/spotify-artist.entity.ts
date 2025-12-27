import "reflect-metadata";
import type { SpotifyArtistExternal } from "@ait/core";
import type { SpotifyArtistDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Spotify Artist entity with class-transformer decorators.
 */
export class SpotifyArtistEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  popularity!: number;

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

  readonly __type = "artist" as const;
}

/**
 * Transform external Spotify API response to domain entity.
 */
export function mapSpotifyArtist(external: SpotifyArtistExternal): SpotifyArtistEntity {
  return plainToInstance(SpotifyArtistEntity, external, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyArtists(externals: SpotifyArtistExternal[]): SpotifyArtistEntity[] {
  return externals.map(mapSpotifyArtist);
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function spotifyArtistDomainToDataTarget(domain: SpotifyArtistEntity): SpotifyArtistDataTarget {
  return instanceToPlain(domain) as SpotifyArtistDataTarget;
}

export function spotifyArtistDataTargetToDomain(dataTarget: SpotifyArtistDataTarget): SpotifyArtistEntity {
  return plainToInstance(SpotifyArtistEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
