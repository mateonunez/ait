import { ConnectorOAuth, type IConnectorOAuthConfig } from "@/shared/auth/lib/oauth/connector.oauth";
import type { BaseConnectorAbstract } from "@/infrastructure/connector.base.abstract";

export abstract class ConnectorServiceBase<TConnector extends BaseConnectorAbstract<any, any, any, any>, TEntity> {
  protected _connector: TConnector;

  constructor(config: IConnectorOAuthConfig) {
    const oauth = new ConnectorOAuth(config);
    this._connector = this.createConnector(oauth);
  }

  async authenticate(code: string): Promise<void> {
    await this._connector.connect(code);
  }

  protected async fetchEntities<T>(fetcher: () => Promise<T[]>, mapper: (entity: T) => TEntity): Promise<TEntity[]> {
    await this._connector.connect();
    const entities = await fetcher();
    return entities?.length ? entities.map(mapper) : [];
  }

  protected abstract createConnector(oauth: ConnectorOAuth): TConnector;

  get connector(): TConnector {
    return this._connector;
  }

  set connector(connector: TConnector) {
    this._connector = connector;
  }
}
