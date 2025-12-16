import { AItError, type ValidationSchema, getLogger, validate } from "@ait/core";
import { getRedisClient } from "@ait/redis";
import type { BaseConnectorAbstract } from "../infrastructure/connector.base.abstract";
import type { IConnectorOAuthConfig } from "../shared/auth/lib/oauth/connector.oauth";
import { ConnectorOAuth } from "../shared/auth/lib/oauth/connector.oauth";

import { createHash } from "node:crypto";
import { SyncStateService } from "./shared/sync/sync-state.service";
import type { ConnectorCursor } from "./vendors/connector.vendors.config";

interface EntityConfig<TEntityMap, K extends keyof TEntityMap, E> {
  fetcher?: () => Promise<E[]>;
  paginatedFetcher?: (cursor?: ConnectorCursor) => Promise<{
    data: E[];
    nextCursor?: ConnectorCursor;
  }>;
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
      paginatedFetcher: (
        connector: TConnector,
        cursor?: ConnectorCursor,
      ) => Promise<{
        data: E[];
        nextCursor?: ConnectorCursor;
      }>;
      mapper: (external: E) => TEntityMap[K];
      schema?: ValidationSchema<E>;
      cacheTtl?: number;
      batchSize?: number;
      checksumEnabled?: boolean;
    },
  ): void {
    this.entityConfigs.set(entityType, {
      paginatedFetcher: (cursor?: ConnectorCursor) => config.paginatedFetcher(this._connector, cursor),
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
    forceRefresh = true,
  ): Promise<TEntityMap[K][]> {
    const entities: TEntityMap[K][] = [];
    for await (const batch of this.fetchEntitiesPaginated(entityType, shouldConnect, forceRefresh)) {
      entities.push(...batch);
    }
    return entities;
  }

  public async *fetchEntitiesPaginated<K extends keyof TEntityMap, E>(
    entityType: K,
    shouldConnect = false,
    forceRefresh = false,
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

    // When forceRefresh is true, ignore stored cursor to fetch fresh data
    // This is the default for user-initiated fetches (e.g., from routes)
    // Background ETL jobs should pass forceRefresh=false to resume from stored cursor
    let cursor = forceRefresh ? undefined : syncState?.cursor;

    this._logger.info(`🔗 Fetching ${String(entityType)}${cursor ? " (resuming from cursor)" : " (fresh fetch)"}`);

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

    let totalFetched = 0;
    let totalSkipped = 0;
    let totalYielded = 0;

    while (hasMore) {
      if (!config.paginatedFetcher) break;

      const result = await config.paginatedFetcher(cursor);
      let entities = result.data;
      cursor = result.nextCursor;
      hasMore = !!cursor;

      totalFetched += entities.length;
      this._logger.debug(`   └─ Batch: ${entities.length.toLocaleString()} items${hasMore ? " (more available)" : ""}`);

      if (config.schema && entities.length > 0) {
        entities = this.validateEntities(entities, config.schema, String(entityType));
      }

      const changedEntities: TEntityMap[K][] = [];
      for (const entity of entities) {
        // When forceRefresh is enabled, skip checksum deduplication to return all entities
        // This ensures fresh data is returned to the user
        if (config.checksumEnabled && !forceRefresh) {
          const id = (entity as any).id || (entity as any).uuid;
          if (id) {
            const hash = this.calculateChecksum(entity);
            if (checksums[id] === hash) {
              totalSkipped++;
              continue;
            }
            newChecksums[id] = hash;
          }
        }
        changedEntities.push(config.mapper(entity));
      }

      if (changedEntities.length > 0) {
        totalYielded += changedEntities.length;
        yield changedEntities;
      }

      // Only update checksums and save cursor when NOT doing a force refresh
      // This preserves the ability for ETL jobs to resume from stored state
      if (!forceRefresh) {
        if (config.checksumEnabled && Object.keys(newChecksums).length > 0) {
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

    this._logger.info(
      `✅ Completed ${String(entityType)}: ${totalYielded.toLocaleString()} items yielded (${totalSkipped.toLocaleString()} unchanged, ${totalFetched.toLocaleString()} total)`,
    );
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
        this.getLogger().debug(`   └─ Skipped invalid entity in ${entityType}`);
      }
    }

    if (invalidCount > 0) {
      this.getLogger().warn(`⚠️ Skipped ${invalidCount.toLocaleString()} invalid entities for ${entityType}`);
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
