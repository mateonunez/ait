import dotenv from "dotenv";
import { ConnectorSpotify } from "../../infrastructure/spotify/connector.spotify";
import { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorService } from "../connector.service.interface";
import type { IConnectorSpotifyService } from "./connector.spotify.service.interface";
import type { SpotifyTrack } from "../../domain/entities/spotify/connector.spotify.entities";
import type { SpotifyTrackEntity } from "../../domain/entities/spotify/connector.spotify.entities";
import { connectorSpotifyTrackMapper } from "../../domain/mappers/spotify/connector.spotify.mapper";

dotenv.config();

export class ConnectorSpotifyService implements IConnectorService<ConnectorSpotify>, IConnectorSpotifyService {
  private _connector: ConnectorSpotify;

  constructor() {
    const oauth = new ConnectorOAuth({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      endpoint: process.env.SPOTIFY_ENDPOINT!,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI!,
    });

    this._connector = new ConnectorSpotify(oauth);
  }

  async getTracks(): Promise<SpotifyTrackEntity[]> {
    const tracks = await this._connector.dataSource?.fetchTopTracks();
    if (!tracks?.length) {
      return [];
    }

    return tracks.map((track) => connectorSpotifyTrackMapper.externalToDomain(track));
  }

  async authenticate(code: string): Promise<void> {
    await this._connector.connect(code);
  }

  get connector(): ConnectorSpotify {
    return this._connector;
  }

  set connector(connector: ConnectorSpotify) {
    this._connector = connector;
  }
}
