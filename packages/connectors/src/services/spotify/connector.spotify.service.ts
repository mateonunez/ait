import dotenv from "dotenv";
import { ConnectorSpotify } from "../../infrastructure/spotify/connector.spotify";
import { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorService } from "../connector.service.interface";
import type { IConnectorSpotifyService } from "./connector.spotify.service.interface";
import type { SpotifyTrack } from "../../infrastructure/spotify/normalizer/connector.spotify.normalizer.interface";

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

  async getTracks(): Promise<SpotifyTrack[]> {
    return this._connector.dataSource?.fetchTopTracks() || [];
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
