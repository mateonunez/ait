import type { BaseConnectorAbstract } from "../infrastructure/connector.base.abstract";
import { AItError, getLogger, validate, type ValidationSchema } from "@ait/core";
import type { IConnectorOAuthConfig } from "../shared/auth/lib/oauth/connector.oauth";
import { ConnectorOAuth } from "../shared/auth/lib/oauth/connector.oauth";
import { getRedisClient } from "@ait/redis";

import { SyncStateService } from "./shared/sync/sync-state.service";
import { createHash } from "node:crypto";

interface EntityConfig<TEntityMap, K extends keyof TEntityMap, E> {
  fetcher?: () => Promise<E[]>;
  paginatedFetcher?: (cursor?: string) => Promise<{ data: E[]; nextCursor?: string }>;
  mapper: (entity: E) => TEntityMap[K];
  schema?: ValidationSchema<E>;
  cacheTtl?: number;
  batchSize?: number;
  checksumEnabled?: boolean;
}

export abstract class ConnectorServiceBase<
  TConnector extends BaseConnectorAbstract<any, any, any, any>,
  TEntityMap extends Record<string, any>,
> {
  protected _connector: TConnector;
  protected entityConfigs: Map<keyof TEntityMap, EntityConfig<TEntityMap, any, any>> = new Map();
  private _logger = getLogger();
  private _syncStateService = new SyncStateService();

  constructor(config: IConnectorOAuthConfig) {
    const oauth = new ConnectorOAuth(config);
    this._connector = this.createConnector(oauth);
  }

  protected registerEntityConfig<K extends keyof TEntityMap, E>(
    entityType: K,
    config: {
      fetcher: (connector: TConnector) => Promise<E[]>;
      mapper: (external: E) => TEntityMap[K];
      schema?: ValidationSchema<E>;
      cacheTtl?: number;
    },
  ): void {
    this.entityConfigs.set(entityType, {
      fetcher: () => config.fetcher(this._connector),
      mapper: config.mapper,
      schema: config.schema,
      cacheTtl: config.cacheTtl,
    });
  }

  protected registerPaginatedEntityConfig<K extends keyof TEntityMap, E>(
    entityType: K,
    config: {
      paginatedFetcher: (connector: TConnector, cursor?: string) => Promise<{ data: E[]; nextCursor?: string }>;
      mapper: (external: E) => TEntityMap[K];
      schema?: ValidationSchema<E>;
      cacheTtl?: number;
      batchSize?: number;
      checksumEnabled?: boolean;
    },
  ): void {
    this.entityConfigs.set(entityType, {
      paginatedFetcher: (cursor?: string) => config.paginatedFetcher(this._connector, cursor),
      mapper: config.mapper,
      schema: config.schema,
      cacheTtl: config.cacheTtl,
      batchSize: config.batchSize,
      checksumEnabled: config.checksumEnabled,
    });
  }

  protected async fetchEntities<K extends keyof TEntityMap, E>(
    entityType: K,
    shouldConnect = false,
  ): Promise<TEntityMap[K][]> {
    const entities: TEntityMap[K][] = [];
    for await (const batch of this.fetchEntitiesPaginated(entityType, shouldConnect)) {
      entities.push(...batch);
    }
    return entities;
  }

  public async *fetchEntitiesPaginated<K extends keyof TEntityMap, E>(
    entityType: K,
    shouldConnect = false,
  ): AsyncGenerator<TEntityMap[K][], void, unknown> {
    const config = this.entityConfigs.get(entityType) as EntityConfig<TEntityMap, K, E>;
    if (!config) {
      throw new AItError("CONNECTOR_ENTITY_CONFIG", `No configuration found for entity type: ${String(entityType)}`);
    }

    if (shouldConnect) {
      await this._connector.connect();
    }

    const redis = this.getRedisClient();
    const sessionId = await this._connector.getSessionId();
    const connectorName = this.constructor.name;
    const syncState = await this._syncStateService.getState(connectorName, String(entityType));

    let cursor = syncState?.cursor;
    let hasMore = true;
    const checksums = syncState?.checksums || {};
    const newChecksums: Record<string, string> = {};

    // Cache key format: connector:ServiceName:SessionHash:EntityType
    const cacheKey = sessionId ? `connector:${connectorName}:${sessionId}:${String(entityType)}` : null;

    if (config.fetcher && !config.paginatedFetcher) {
      const entities = await this.fetchEntitiesLegacy(entityType, config, cacheKey, redis);
      if (entities.length > 0) {
        yield entities;
      }
      return;
    }

    while (hasMore) {
      if (!config.paginatedFetcher) break;

      const result = await config.paginatedFetcher(cursor);
      let entities = result.data;
      cursor = result.nextCursor;
      hasMore = !!cursor;

      if (config.schema && entities.length > 0) {
        entities = this.validateEntities(entities, config.schema, String(entityType));
      }

      const changedEntities: TEntityMap[K][] = [];
      for (const entity of entities) {
        if (config.checksumEnabled) {
          const id = (entity as any).id || (entity as any).uuid;
          if (id) {
            const hash = this.calculateChecksum(entity);
            if (checksums[id] === hash) {
              continue;
            }
            newChecksums[id] = hash;
          }
        }
        changedEntities.push(config.mapper(entity));
      }

      if (changedEntities.length > 0) {
        yield changedEntities;
      }

      if (config.checksumEnabled) {
        await this._syncStateService.updateChecksums(connectorName, String(entityType), newChecksums);
      }

      if (cursor) {
        await this._syncStateService.saveState({
          connectorName,
          entityType: String(entityType),
          lastSyncTime: new Date(),
          cursor,
          checksums: { ...checksums, ...newChecksums },
        });
      }
    }
  }

  private async fetchEntitiesLegacy<K extends keyof TEntityMap, E>(
    entityType: K,
    config: EntityConfig<TEntityMap, K, E>,
    cacheKey: string | null,
    redis: any,
  ): Promise<TEntityMap[K][]> {
    let entities: E[] = [];

    if (cacheKey && config.cacheTtl) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          entities = JSON.parse(cached);
          this.getLogger().debug(`[ConnectorService] Cache hit for ${String(entityType)}`, { cacheKey });
        }
      } catch (error) {
        this.getLogger().warn(`[ConnectorService] Cache read failed for ${String(entityType)}`, { error });
      }
    }

    if (!entities.length && config.fetcher) {
      entities = await config.fetcher();

      if (config.schema && entities.length > 0) {
        entities = this.validateEntities(entities, config.schema, String(entityType));
      }

      if (cacheKey && config.cacheTtl && entities.length > 0) {
        try {
          await redis.set(cacheKey, JSON.stringify(entities), "EX", config.cacheTtl);
        } catch (error) {
          this.getLogger().warn(`[ConnectorService] Cache write failed for ${String(entityType)}`, { error });
        }
      }
    }
    return entities?.length ? entities.map(config.mapper) : [];
  }

  private validateEntities<E>(entities: E[], schema: ValidationSchema<E>, entityType: string): E[] {
    const validEntities: E[] = [];
    let invalidCount = 0;

    for (const entity of entities) {
      const result = validate(schema, entity, `Entity ${entityType}`);
      if (result.ok) {
        validEntities.push(result.value);
      } else {
        invalidCount++;
        this.getLogger().warn(`[ConnectorService] Validation failed for entity in ${entityType}`, {
          error: result.error,
        });
      }
    }

    if (invalidCount > 0) {
      this.getLogger().info(`[ConnectorService] Skipped ${invalidCount} invalid entities for ${entityType}`);
    }
    return validEntities;
  }

  protected calculateChecksum<E>(entity: E): string {
    return createHash("md5").update(JSON.stringify(entity)).digest("hex");
  }

  protected getLogger() {
    return this._logger;
  }

  protected getRedisClient(): ReturnType<typeof getRedisClient> {
    return getRedisClient();
  }

  protected abstract createConnector(oauth: ConnectorOAuth): TConnector;

  get connector(): TConnector {
    return this._connector;
  }

  set connector(connector: TConnector) {
    this._connector = connector;
  }
}
