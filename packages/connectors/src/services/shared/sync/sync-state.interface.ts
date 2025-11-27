export interface ISyncState {
  connectorName: string;
  entityType: string;
  lastSyncTime: Date;
  cursor?: string;
  checksums: Record<string, string>; // entityId -> checksum
  // ETL tracking
  lastETLRun?: Date;
  lastProcessedTimestamp?: Date;
}

export interface ISyncStateService {
  getState(connectorName: string, entityType: string): Promise<ISyncState | null>;
  saveState(state: ISyncState): Promise<void>;
  updateChecksums(connectorName: string, entityType: string, checksums: Record<string, string>): Promise<void>;
  updateETLTimestamp(connectorName: string, entityType: string, lastProcessedTimestamp: Date): Promise<void>;
  clearState(connectorName: string, entityType: string): Promise<void>;
  clearCursor(connectorName: string, entityType: string): Promise<void>;
}
