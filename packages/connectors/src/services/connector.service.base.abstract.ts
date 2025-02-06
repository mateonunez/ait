import { ConnectorOAuth, type IConnectorOAuthConfig } from "@/shared/auth/lib/oauth/connector.oauth";
import type { BaseConnectorAbstract } from "@/infrastructure/connector.base.abstract";

interface EntityConfig<TEntityMap, K extends keyof TEntityMap, E> {
  fetcher: () => Promise<E[]>;
  mapper: (entity: E) => TEntityMap[K];
}

export abstract class ConnectorServiceBase<
  TConnector extends BaseConnectorAbstract<any, any, any, any>,
  TEntityMap extends Record<string, any>,
> {
  protected _connector: TConnector;
  protected entityConfigs: Map<keyof TEntityMap, EntityConfig<TEntityMap, any, any>> = new Map();

  constructor(config: IConnectorOAuthConfig) {
    const oauth = new ConnectorOAuth(config);
    this._connector = this.createConnector(oauth);
  }

  protected registerEntityConfig<K extends keyof TEntityMap, E>(
    entityType: K,
    config: EntityConfig<TEntityMap, K, E>,
  ): void {
    this.entityConfigs.set(entityType, config);
  }

  protected async fetchEntities<K extends keyof TEntityMap, E>(entityType: K): Promise<TEntityMap[K][]> {
    const config = this.entityConfigs.get(entityType) as EntityConfig<TEntityMap, K, E>;
    if (!config) {
      throw new Error(`No configuration found for entity type: ${String(entityType)}`);
    }

    await this._connector.connect();
    const entities = await config.fetcher();
    return entities?.length ? entities.map(config.mapper) : [];
  }

  protected abstract createConnector(oauth: ConnectorOAuth): TConnector;

  get connector(): TConnector {
    return this._connector;
  }

  set connector(connector: TConnector) {
    this._connector = connector;
  }
}
