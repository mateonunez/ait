import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { SpotifyArtistExternal } from "../../types/integrations";

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
  @Transform(({ value }: any) => value ?? [])
  genres!: string[];

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  images!: { url: string; height: number; width: number }[] | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "spotify_artist" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): SpotifyArtistEntity {
    return plainToInstance(SpotifyArtistEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external Spotify API response to domain entity.
 */
export function mapSpotifyArtist(external: SpotifyArtistExternal): SpotifyArtistEntity {
  return plainToInstance(SpotifyArtistEntity, external, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyArtists(externals: SpotifyArtistExternal[]): SpotifyArtistEntity[] {
  return externals.map(mapSpotifyArtist);
}
