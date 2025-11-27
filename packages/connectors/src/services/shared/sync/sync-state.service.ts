import { getRedisClient } from "@ait/redis";
import type { ISyncState, ISyncStateService } from "./sync-state.interface";
import { getLogger } from "@ait/core";

export class SyncStateService implements ISyncStateService {
  private redis = getRedisClient();
  private logger = getLogger();
  private readonly TTL = 60 * 60 * 24 * 7; // 7 days

  private getKey(connectorName: string, entityType: string): string {
    return `sync-state:${connectorName}:${entityType}`;
  }

  async getState(connectorName: string, entityType: string): Promise<ISyncState | null> {
    try {
      const key = this.getKey(connectorName, entityType);
      const data = await this.redis.get(key);
      if (!data) return null;

      const state = JSON.parse(data) as ISyncState;
      // Convert date strings back to Date objects
      if (state.lastSyncTime) state.lastSyncTime = new Date(state.lastSyncTime);
      if (state.lastETLRun) state.lastETLRun = new Date(state.lastETLRun);
      if (state.lastProcessedTimestamp) state.lastProcessedTimestamp = new Date(state.lastProcessedTimestamp);

      return state;
    } catch (error) {
      this.logger.error("Failed to get sync state", { connectorName, entityType, error });
      return null;
    }
  }

  async clearState(connectorName: string, entityType: string): Promise<void> {
    try {
      const key = this.getKey(connectorName, entityType);
      await this.redis.del(key);
      this.logger.info("Cleared sync state", { connectorName, entityType });
    } catch (error) {
      this.logger.error("Failed to clear sync state", { connectorName, entityType, error });
    }
  }

  async clearCursor(connectorName: string, entityType: string): Promise<void> {
    try {
      const state = await this.getState(connectorName, entityType);
      if (state?.cursor) {
        state.cursor = undefined;
        await this.saveState(state);
        this.logger.info("Cleared sync cursor", { connectorName, entityType });
      }
    } catch (error) {
      this.logger.error("Failed to clear sync cursor", { connectorName, entityType, error });
    }
  }

  async saveState(state: ISyncState): Promise<void> {
    try {
      const key = this.getKey(state.connectorName, state.entityType);
      await this.redis.set(key, JSON.stringify(state), "EX", this.TTL);
    } catch (error) {
      this.logger.error("Failed to save sync state", { state, error });
    }
  }

  async updateChecksums(connectorName: string, entityType: string, checksums: Record<string, string>): Promise<void> {
    const state = await this.getState(connectorName, entityType);
    if (state) {
      state.checksums = { ...state.checksums, ...checksums };
      state.lastSyncTime = new Date();
      await this.saveState(state);
    }
  }

  async updateETLTimestamp(connectorName: string, entityType: string, lastProcessedTimestamp: Date): Promise<void> {
    try {
      const state = await this.getState(connectorName, entityType);
      if (state) {
        state.lastETLRun = new Date();
        state.lastProcessedTimestamp = lastProcessedTimestamp;
        await this.saveState(state);
      } else {
        await this.saveState({
          connectorName,
          entityType,
          lastSyncTime: new Date(),
          checksums: {},
          lastETLRun: new Date(),
          lastProcessedTimestamp,
        });
      }
    } catch (error) {
      this.logger.error("Failed to update ETL timestamp", { connectorName, entityType, error });
    }
  }
}
