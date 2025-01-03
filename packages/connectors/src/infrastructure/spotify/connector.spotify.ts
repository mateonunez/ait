import type { IConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth.interface";
import type { IConnector } from "../connector.interface";
import { ConnectorSpotifyAuthenticator } from "./authenticator/connector.spotify.authenticator";
import { ConnectorSpotifyDataSource } from "./data-source/connector.spotify.data-source";
import type { IConnectorSpotifyDataSource } from "./data-source/connector.spotify.data-source.interface";
import { ConnectorSpotifyNormalizer } from "./normalizer/connector.spotify.normalizer";
import { ConnectorSpotifyStore } from "./store/connector.spotify.store";

export class ConnectorSpotify
  implements
    IConnector<
      ConnectorSpotifyAuthenticator,
      IConnectorSpotifyDataSource,
      ConnectorSpotifyNormalizer,
      ConnectorSpotifyStore
    >
{
  private _authenticator: ConnectorSpotifyAuthenticator;
  private _dataSource?: IConnectorSpotifyDataSource;
  private _normalizer: ConnectorSpotifyNormalizer;
  private _store: ConnectorSpotifyStore;

  constructor(oauth: IConnectorOAuth) {
    this._authenticator = new ConnectorSpotifyAuthenticator(oauth);
    this._normalizer = new ConnectorSpotifyNormalizer();
    this._store = new ConnectorSpotifyStore();
  }

  async connect(code: string): Promise<void> {
    const { access_token: accessToken } =
      await this._authenticator.authenticate(code);

    this._dataSource = new ConnectorSpotifyDataSource(accessToken);

    const tracks = await this._dataSource.fetchTopTracks();
    const normalizedTrack = tracks.map((track) =>
      this._normalizer.normalize(track)
    );

    await this._store.save(normalizedTrack);
  }

  get authenticator(): ConnectorSpotifyAuthenticator {
    return this._authenticator;
  }

  set authenticator(authenticator: ConnectorSpotifyAuthenticator) {
    this._authenticator = authenticator;
  }

  get dataSource(): IConnectorSpotifyDataSource | undefined {
    return this._dataSource;
  }

  set dataSource(dataSource: ConnectorSpotifyDataSource | undefined) {
    this._dataSource = dataSource;
  }

  get normalizer(): ConnectorSpotifyNormalizer {
    return this._normalizer;
  }

  set normalizer(normalizer: ConnectorSpotifyNormalizer) {
    this._normalizer = normalizer;
  }

  get store(): ConnectorSpotifyStore {
    return this._store;
  }

  set store(store: ConnectorSpotifyStore) {
    this._store = store;
  }
}
