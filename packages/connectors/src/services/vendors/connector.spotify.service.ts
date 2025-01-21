import type { SpotifyTrackEntity } from "@/domain/entities/vendors/connector.spotify.repository";
import type { IConnectorService } from "@/services/connector.service.interface";
import { connectorSpotifyTrackMapper } from "@/domain/mappers/vendors/connector.spotify.mapper";
import { ConnectorSpotify } from "@/infrastructure/vendors/spotify/connector.spotify";
import { ConnectorOAuth } from "@/shared/auth/lib/oauth/connector.oauth";
import dotenv from "dotenv";

dotenv.config();

export interface IConnectorSpotifyService {
  getTracks(): Promise<SpotifyTrackEntity[]>;
}

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
    await this._connector.connect(); // <- Required, always.

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
