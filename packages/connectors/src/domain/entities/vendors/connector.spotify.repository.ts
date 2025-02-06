import { getPostgresClient, type OAuthTokenDataTarget, spotifyTracks } from "@ait/postgres";
import { connectorSpotifyTrackMapper } from "../../mappers/vendors/connector.spotify.mapper";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { getOAuthData, saveOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import { randomUUID } from "node:crypto";
import type { IConnectorRepository } from "../connector.repository.interface";

/**
 * Options for saving a track
 */
export interface IConnectorSpotifyTrackRepositoryOptions {
  incremental: boolean;
}

/**
 * Repository interface for Spotify tracks
 */
export interface IConnectorSpotifyTrackRepository {
  saveTrack(track: SpotifyTrackEntity, options?: IConnectorSpotifyTrackRepositoryOptions): Promise<void>;
  saveTracks(tracks: SpotifyTrackEntity[]): Promise<void>;

  getTrack(id: string): Promise<SpotifyTrackEntity | null>;
  getTracks(): Promise<SpotifyTrackEntity[]>;
}

/**
 * Repository interface for Spotify tracks
 */
export interface IConnectorSpotifyRepository extends IConnectorRepository {
  track: IConnectorSpotifyTrackRepository;
}

/**
 * Base interface for all Spotify entities
 */
export interface BaseSpotifyEntity {
  type: "track" | "album" | "artist" | "playlist";
}

/**
 * EXTERNAL
 */

/**
 * Represents a Spotify artist
 */
export interface SpotifyArtist {
  id: string;
  name: string;
  href: string;
  type: string;
  uri: string;
}

/**
 * Represents a Spotify album
 */
export interface SpotifyAlbum {
  album_type: string;
  artists: SpotifyArtist[];
  available_markets: string[];
  external_urls: { [key: string]: string };
  href: string;
  id: string;
  images: { url: string; height: number; width: number }[];
  is_playable: boolean;
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}

/**
 * Represents a Spotify track
 */
export interface SpotifyTrack extends BaseSpotifyEntity {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;

  [key: string]: any;
}

/**
 * EXTERNAL
 * Represents the raw data from Spotify with the type of the entity
 */
export interface SpotifyTrackExternal extends SpotifyTrack, BaseSpotifyEntity {
  type: "track";
}

/**
 * DOMAIN
 * Represents a simplified domain entity
 */
export interface SpotifyTrackEntity extends BaseSpotifyEntity {
  id: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
  type: "track";
}

/**
 * Union type for any Spotify domain entity
 */
export type SpotifyEntity = SpotifyTrackEntity; // | SpotifyAlbumEntity | SpotifyArtistEntity | SpotifyPlaylistEntity;

/**
 * Union type for any Spotify external data representation
 */
export type SpotifyData = SpotifyTrackExternal; // | SpotifyAlbum | SpotifyArtist | SpotifyPlaylist;

/**
 * Base interface for all Spotify entities
 */
export class ConnectorSpotifyTrackRepository implements IConnectorSpotifyTrackRepository {
  private _pgClient = getPostgresClient();

  async saveTrack(
    track: SpotifyTrackEntity,
    options: IConnectorSpotifyTrackRepositoryOptions = { incremental: false },
  ): Promise<void> {
    const { incremental } = options;
    const trackId = incremental ? randomUUID() : track.id;

    try {
      const trackDataTarget = connectorSpotifyTrackMapper.domainToDataTarget(track);
      trackDataTarget.id = trackId;

      await this._pgClient.db.transaction(async (tx) => {
        await tx.insert(spotifyTracks).values(trackDataTarget).onConflictDoNothing().execute();
      });

      console.debug("Track saved successfully:", { trackId: track.id });
    } catch (error: any) {
      console.error("Failed to save track:", { trackId: track.id, error });
      throw new Error(`Failed to save track ${track.id}: ${error.message}`);
    }
  }

  async saveTracks(tracks: SpotifyTrackEntity[]): Promise<void> {
    if (!tracks.length) {
      return;
    }

    try {
      await Promise.all(tracks.map((track) => this.saveTrack(track)));
    } catch (error) {
      console.error("Error saving tracks:", error);
      throw new Error("Failed to save tracks to repository");
    }
  }

  async getTrack(id: string): Promise<SpotifyTrackEntity | null> {
    console.log("Getting track from Spotify repository", id);
    return null;
  }

  async getTracks(): Promise<SpotifyTrackEntity[]> {
    console.log("Getting tracks from Spotify repository");
    return [];
  }
}

/**
 * Connector for Spotify Repository: tracks, albums, artists, playlists, etc
 */
export class ConnectorSpotifyRepository extends ConnectorSpotifyTrackRepository implements IConnectorSpotifyRepository {
  private _spotifyTrackRepository: ConnectorSpotifyTrackRepository;

  constructor() {
    super();
    this._spotifyTrackRepository = new ConnectorSpotifyTrackRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    saveOAuthData(data, "spotify");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("spotify");
  }

  get track(): ConnectorSpotifyTrackRepository {
    return this._spotifyTrackRepository;
  }

  set track(trackRepository: ConnectorSpotifyTrackRepository) {
    this._spotifyTrackRepository = trackRepository;
  }
}
