import { ConnectorSpotifyRepository } from "../../domain/entities/spotify/connector.spotify.repository";
import type { IConnectorSpotifyRepository } from "../../domain/entities/spotify/connector.spotify.repository.interface";
import type { IConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth.interface";
import type { IConnector } from "../connector.interface";
import { ConnectorSpotifyAuthenticator } from "./authenticator/connector.spotify.authenticator";
import { ConnectorSpotifyDataSource } from "./data-source/connector.spotify.data-source";
import type { IConnectorSpotifyDataSource } from "./data-source/connector.spotify.data-source.interface";
import { ConnectorSpotifyStore } from "./store/connector.spotify.store";

export class ConnectorSpotify
  implements IConnector<ConnectorSpotifyAuthenticator, IConnectorSpotifyDataSource, ConnectorSpotifyStore>
{
  private _authenticator: ConnectorSpotifyAuthenticator;
  private _dataSource?: IConnectorSpotifyDataSource;
  private _store: ConnectorSpotifyStore;
  private _repository: IConnectorSpotifyRepository;

  constructor(oauth: IConnectorOAuth) {
    this._authenticator = new ConnectorSpotifyAuthenticator(oauth);
    this._repository = new ConnectorSpotifyRepository();
    this._store = new ConnectorSpotifyStore(this._repository);
  }

  async connect(code: string): Promise<void> {
    const { access_token: accessToken } = await this._authenticator.authenticate(code);

    this._dataSource = new ConnectorSpotifyDataSource(accessToken);
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

  get store(): ConnectorSpotifyStore {
    return this._store;
  }

  set store(store: ConnectorSpotifyStore) {
    this._store = store;
  }
}
