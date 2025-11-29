import { getLogger } from "@ait/core";
import type { Document, BaseMetadata } from "../../types/documents";
import { TemporalDateParser, type ITemporalDateParser } from "./temporal-date-parser.service";

const logger = getLogger();

export interface TemporalEntity {
  type: string;
  content: string;
  timestamp: Date;
  metadata: BaseMetadata;
  document: Document<BaseMetadata>;
}

export interface TemporalCluster {
  timeWindow: { start: Date; end: Date };
  entities: TemporalEntity[];
  centerTimestamp: Date;
}

export interface ITemporalCorrelationService {
  correlateByTimeWindow(documents: Document<BaseMetadata>[], windowHours?: number): TemporalCluster[];
}

export class TemporalCorrelationService implements ITemporalCorrelationService {
  private readonly _defaultWindowHours: number;
  private readonly _mergeGapMinutes: number;
  private readonly _dateParser: ITemporalDateParser;

  constructor(defaultWindowHours = 3, mergeGapMinutes = 30, dateParser?: ITemporalDateParser) {
    this._defaultWindowHours = defaultWindowHours;
    this._mergeGapMinutes = mergeGapMinutes;
    this._dateParser = dateParser || new TemporalDateParser();
  }

  correlateByTimeWindow(
    documents: Document<BaseMetadata>[],
    windowHours: number = this._defaultWindowHours,
  ): TemporalCluster[] {
    // Extract timestamps from documents
    const entitiesWithTimestamps = this._extractTimestamps(documents);

    if (entitiesWithTimestamps.length === 0) {
      logger.warn("No documents with valid timestamps found for temporal correlation");
      return [];
    }

    entitiesWithTimestamps.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    let clusters = this._clusterByTimeWindow(entitiesWithTimestamps, windowHours);
    clusters = this._mergeAdjacentClusters(clusters, this._mergeGapMinutes);

    return clusters;
  }

  private _extractTimestamps(documents: Document<BaseMetadata>[]): TemporalEntity[] {
    const entities: TemporalEntity[] = [];

    for (const doc of documents) {
      const timestamp = this._getTimestampFromMetadata(doc.metadata);

      if (timestamp) {
        entities.push({
          type: doc.metadata.__type || "unknown",
          content: doc.pageContent,
          timestamp,
          metadata: doc.metadata,
          document: doc,
        });
      }
    }

    return entities;
  }

  private _getTimestampFromMetadata(metadata: BaseMetadata): Date | null {
    // Entity-type-specific primary timestamp fields (matches Qdrant filter logic)
    const entityDateFields: Record<string, string> = {
      recently_played: "playedAt",
      tweet: "createdAt",
      pull_request: "mergedAt",
      repository: "pushedAt",
      issue: "updatedAt",
      track: "createdAt",
      artist: "createdAt",
      playlist: "createdAt",
      album: "createdAt",
    };

    const entityType = metadata.__type;

    // Try entity-specific field first
    if (entityType && entityDateFields[entityType]) {
      const primaryField = entityDateFields[entityType];
      const value = (metadata as any)[primaryField];
      if (value) {
        const date = this._parseDate(value);
        if (date) return date;
      }
    }

    // Fallback: try common timestamp fields
    const fallbackFields = [
      "createdAt",
      "playedAt",
      "updatedAt",
      "mergedAt",
      "pushedAt",
      "closedAt",
      "publishedAt",
      "timestamp",
      "date",
    ];
    for (const field of fallbackFields) {
      const value = (metadata as any)[field];
      if (value) {
        const date = this._parseDate(value);
        if (date) return date;
      }
    }

    return null;
  }

  private _parseDate(value: unknown): Date | null {
    return this._dateParser.parseDate(value);
  }

  private _clusterByTimeWindow(entities: TemporalEntity[], windowHours: number): TemporalCluster[] {
    if (entities.length === 0) return [];

    const clusters: TemporalCluster[] = [];
    const windowMs = windowHours * 60 * 60 * 1000;

    // Use a sliding window approach
    // Start from the most recent entity and group all entities within the time window
    const processed = new Set<number>();

    for (let i = 0; i < entities.length; i++) {
      if (processed.has(i)) continue;

      const centerEntity = entities[i]!;
      const centerTime = centerEntity.timestamp.getTime();

      // Define the time window around this entity
      const windowStart = new Date(centerTime - windowMs);
      const windowEnd = new Date(centerTime + windowMs);

      // Collect all entities within this window
      const clusterEntities: TemporalEntity[] = [];

      for (let j = 0; j < entities.length; j++) {
        if (processed.has(j)) continue;

        const entityTime = entities[j]?.timestamp.getTime() ?? 0;

        // Check if entity falls within the window
        if (entityTime >= windowStart.getTime() && entityTime <= windowEnd.getTime()) {
          clusterEntities.push(entities[j]!);
          processed.add(j);
        }
      }

      if (clusterEntities.length > 0) {
        // Calculate actual min/max timestamps in this cluster
        const timestamps = clusterEntities.map((e) => e.timestamp.getTime());
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);

        clusters.push({
          timeWindow: {
            start: new Date(minTime),
            end: new Date(maxTime),
          },
          entities: clusterEntities,
          centerTimestamp: centerEntity.timestamp,
        });
      }
    }

    return clusters;
  }

  private _mergeAdjacentClusters(clusters: TemporalCluster[], gapMinutes: number): TemporalCluster[] {
    if (clusters.length <= 1) return clusters;
    const merged: TemporalCluster[] = [];
    const gapMs = gapMinutes * 60 * 1000;

    // Clusters are sorted by recency; merge if windows overlap or are close
    let current = clusters[0]!;
    for (let i = 1; i < clusters.length; i++) {
      const next = clusters[i];
      const gap = current.timeWindow.start.getTime() - (next?.timeWindow.end.getTime() ?? 0);
      const overlap = (next?.timeWindow.end.getTime() ?? 0) >= current.timeWindow.start.getTime();
      if (overlap || gap <= gapMs) {
        // merge
        const start = new Date(Math.min(current.timeWindow.start.getTime(), next?.timeWindow.start.getTime() ?? 0));
        const end = new Date(Math.max(current.timeWindow.end.getTime(), next?.timeWindow.end.getTime() ?? 0));
        current = {
          timeWindow: { start, end },
          entities: [...current.entities, ...(next?.entities ?? [])],
          centerTimestamp: current.centerTimestamp,
        };
      } else {
        merged.push(current);
        current = next!;
      }
    }
    merged.push(current);
    return merged;
  }
}
