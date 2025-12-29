import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { SpotifyPlaylistExternal } from "../../types/integrations";

/**
 * Spotify Playlist entity with class-transformer decorators.
 */
export class SpotifyPlaylistEntity {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  description!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  public!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  collaborative!: boolean;

  @Expose()
  owner!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? [])
  tracks!: any[];

  @Expose()
  @Transform(({ value }: any) => value ?? 0)
  followers!: number;

  @Expose()
  snapshotId!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? [])
  externalUrls!: string[];

  @Expose()
  uri!: string;

  @Expose()
  href!: string;

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
  readonly __type = "spotify_playlist" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): SpotifyPlaylistEntity {
    return plainToInstance(SpotifyPlaylistEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Transform external Spotify API response to domain entity.
 */
export function mapSpotifyPlaylist(external: SpotifyPlaylistExternal): SpotifyPlaylistEntity {
  const mapped = {
    ...external,
    owner: external.owner?.display_name ?? "",
    snapshotId: external.snapshot_id,
    followers: 0,
    externalUrls: external.external_urls ? Object.values(external.external_urls).map(String) : [],
    tracks: external.tracks?.items
      ? external.tracks.items
          .filter((item: any) => item?.track)
          .map((item: any) => ({
            added_at: item.added_at ?? null,
            track: item.track
              ? {
                  id: item.track.id ?? "",
                  name: item.track.name ?? "",
                  artist: item.track.artists?.map((a: any) => a.name).join(", ") ?? "",
                  album: item.track.album?.name ?? null,
                  durationMs: item.track.duration_ms ?? 0,
                  uri: item.track.uri ?? null,
                }
              : null,
          }))
      : [],
  };

  return plainToInstance(SpotifyPlaylistEntity, mapped, {
    excludeExtraneousValues: true,
    exposeDefaultValues: true,
  });
}

/**
 * Transform array of external responses.
 */
export function mapSpotifyPlaylists(externals: SpotifyPlaylistExternal[]): SpotifyPlaylistEntity[] {
  return externals.map(mapSpotifyPlaylist);
}
