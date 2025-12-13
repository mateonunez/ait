import { getLogger } from "@ait/core";

// Define ConnectorType locally to avoid dependency on @ait/connectors
// This matches the type from @ait/connectors
export type ConnectorType = "github" | "linear" | "spotify" | "x" | "notion" | "slack" | "google" | "youtube";

const logger = getLogger();

/**
 * Entity metadata for activity tracking
 */
export interface EntityMetadata {
  entityType: string;
  displayName: string;
  dateField: string | string[];
  fetchMethod: string;
  goalType?: string;
}

/**
 * Integration metadata for activity tracking - supports multiple entities per vendor
 */
export interface IntegrationMetadata {
  connectorType: ConnectorType;
  displayName: string;
  entities: EntityMetadata[];
  // Primary entity for backward compatibility and default display
  primaryEntityType: string;
}

/**
 * Registry of all available integrations and their metadata
 */
export class IntegrationRegistryService {
  private static readonly INTEGRATION_METADATA: Record<ConnectorType, IntegrationMetadata> = {
    github: {
      connectorType: "github",
      displayName: "GitHub",
      primaryEntityType: "commit",
      entities: [
        {
          entityType: "repository",
          displayName: "Repositories",
          dateField: "updatedAt",
          fetchMethod: "getRepositoriesPaginated",
        },
        {
          entityType: "pull_request",
          displayName: "Pull Requests",
          dateField: "updatedAt",
          fetchMethod: "getPullRequestsPaginated",
        },
        {
          entityType: "commit",
          displayName: "Commits",
          dateField: "committerDate",
          fetchMethod: "getCommitsPaginated",
          goalType: "commits",
        },
        {
          entityType: "repository_file",
          displayName: "Code Files",
          dateField: "updatedAt",
          fetchMethod: "getFilesPaginated",
        },
      ],
    },
    linear: {
      connectorType: "linear",
      displayName: "Linear",
      primaryEntityType: "issue",
      entities: [
        {
          entityType: "issue",
          displayName: "Issues",
          dateField: "updatedAt",
          fetchMethod: "getIssuesPaginated",
          goalType: "tasks",
        },
      ],
    },
    spotify: {
      connectorType: "spotify",
      displayName: "Spotify",
      primaryEntityType: "recently_played",
      entities: [
        { entityType: "track", displayName: "Tracks", dateField: "updatedAt", fetchMethod: "getTracksPaginated" },
        { entityType: "artist", displayName: "Artists", dateField: "updatedAt", fetchMethod: "getArtistsPaginated" },
        {
          entityType: "playlist",
          displayName: "Playlists",
          dateField: "updatedAt",
          fetchMethod: "getPlaylistsPaginated",
        },
        { entityType: "album", displayName: "Albums", dateField: "updatedAt", fetchMethod: "getAlbumsPaginated" },
        {
          entityType: "recently_played",
          displayName: "Recently Played",
          dateField: "playedAt",
          fetchMethod: "getRecentlyPlayedPaginated",
          goalType: "songs",
        },
      ],
    },
    x: {
      connectorType: "x",
      displayName: "X (Twitter)",
      primaryEntityType: "tweet",
      entities: [
        {
          entityType: "tweet",
          displayName: "Tweets",
          dateField: "createdAt",
          fetchMethod: "getTweetsPaginated",
          goalType: "tweets",
        },
      ],
    },
    notion: {
      connectorType: "notion",
      displayName: "Notion",
      primaryEntityType: "page",
      entities: [
        {
          entityType: "page",
          displayName: "Pages",
          dateField: "updatedAt",
          fetchMethod: "getPagesPaginated",
          goalType: "documents",
        },
      ],
    },
    slack: {
      connectorType: "slack",
      displayName: "Slack",
      primaryEntityType: "message",
      entities: [
        {
          entityType: "message",
          displayName: "Messages",
          dateField: ["ts", "createdAt"],
          fetchMethod: "getMessagesPaginated",
          goalType: "messages",
        },
      ],
    },
    google: {
      connectorType: "google",
      displayName: "Google",
      primaryEntityType: "event",
      entities: [
        {
          entityType: "event",
          displayName: "Events",
          dateField: "startTime",
          fetchMethod: "getEventsPaginated",
          goalType: "events",
        },
        {
          entityType: "calendar",
          displayName: "Calendars",
          dateField: "updatedAt",
          fetchMethod: "getCalendarsPaginated",
        },
        {
          entityType: "subscription",
          displayName: "YouTube Subscriptions",
          dateField: "publishedAt",
          fetchMethod: "getSubscriptionsPaginated",
        },
      ],
    },
    youtube: {
      connectorType: "youtube",
      displayName: "YouTube",
      primaryEntityType: "subscription",
      entities: [
        {
          entityType: "subscription",
          displayName: "Subscriptions",
          dateField: "publishedAt",
          fetchMethod: "getSubscriptionsPaginated",
          goalType: "subscription",
        },
      ],
    },
  };

  /**
   * Get all available connector types
   */
  getAvailableConnectorTypes(): ConnectorType[] {
    return Object.keys(IntegrationRegistryService.INTEGRATION_METADATA) as ConnectorType[];
  }

  /**
   * Get metadata for a specific connector type
   */
  getMetadata(connectorType: ConnectorType): IntegrationMetadata | null {
    return IntegrationRegistryService.INTEGRATION_METADATA[connectorType] || null;
  }

  /**
   * Get all integration metadata
   */
  getAllMetadata(): IntegrationMetadata[] {
    return Object.values(IntegrationRegistryService.INTEGRATION_METADATA);
  }

  /**
   * Get all entities for a connector type
   */
  getEntities(connectorType: ConnectorType): EntityMetadata[] {
    const metadata = this.getMetadata(connectorType);
    return metadata?.entities || [];
  }

  /**
   * Get primary entity metadata for a connector (for backward compatibility)
   */
  getPrimaryEntityMetadata(connectorType: ConnectorType): EntityMetadata | null {
    const metadata = this.getMetadata(connectorType);
    if (!metadata) return null;
    return metadata.entities.find((e) => e.entityType === metadata.primaryEntityType) || metadata.entities[0] || null;
  }

  /**
   * Extract date from an entity based on date field configuration
   */
  extractDateFromEntity(entity: any, dateField: string | string[]): Date | null {
    const fields = Array.isArray(dateField) ? dateField : [dateField];

    for (const field of fields) {
      const fieldValue = entity[field];

      // Handle null/undefined
      if (fieldValue === null || fieldValue === undefined) {
        continue;
      }

      // Handle different date field formats
      if (field === "ts") {
        // Slack uses Unix timestamp as string (e.g., "1234567890.123456")
        if (typeof fieldValue === "string") {
          const timestamp = Number.parseFloat(fieldValue);
          if (!Number.isNaN(timestamp) && timestamp > 0) {
            const ms = timestamp > 1e10 ? timestamp : timestamp * 1000;
            return new Date(ms);
          }
        } else if (typeof fieldValue === "number") {
          const ms = fieldValue > 1e10 ? fieldValue : fieldValue * 1000;
          return new Date(ms);
        }
        continue;
      }

      // Handle Date objects
      if (fieldValue instanceof Date) {
        return fieldValue;
      }

      // Handle string dates (ISO format)
      if (typeof fieldValue === "string") {
        const date = new Date(fieldValue);
        if (!Number.isNaN(date.getTime())) {
          return date;
        }
      }

      // Handle numeric timestamps (milliseconds)
      if (typeof fieldValue === "number" && fieldValue > 0) {
        return new Date(fieldValue);
      }
    }

    return null;
  }

  /**
   * Extract date from an entity based on connector type (backward compatible)
   */
  extractDate(entity: any, connectorType: ConnectorType): Date | null {
    const entityMeta = this.getPrimaryEntityMetadata(connectorType);
    if (!entityMeta) {
      logger.warn("Unknown connector type for date extraction", { connectorType });
      return null;
    }
    return this.extractDateFromEntity(entity, entityMeta.dateField);
  }

  /**
   * Get goal type for a connector type (uses primary entity)
   */
  getGoalType(connectorType: ConnectorType): string | null {
    const entityMeta = this.getPrimaryEntityMetadata(connectorType);
    return entityMeta?.goalType || null;
  }

  /**
   * Get display name for a connector type
   */
  getDisplayName(connectorType: ConnectorType): string {
    const metadata = this.getMetadata(connectorType);
    return metadata?.displayName || connectorType;
  }

  /**
   * Get label for activity description (used in insights)
   */
  getActivityLabel(connectorType: ConnectorType): string {
    const labels: Record<ConnectorType, string> = {
      spotify: "music listening",
      github: "coding",
      slack: "team communication",
      x: "social media activity",
      linear: "task management",
      notion: "documentation",
      google: "calendar events",
      youtube: "video subscriptions",
    };

    return labels[connectorType] || connectorType;
  }

  /**
   * Get unit label for activity counts (used in insights)
   */
  getUnitLabel(connectorType: ConnectorType): string {
    const units: Record<ConnectorType, string> = {
      spotify: "songs",
      github: "commits",
      slack: "messages",
      x: "tweets",
      linear: "tasks",
      notion: "documents",
      google: "events",
      youtube: "subscriptions",
    };

    return units[connectorType] || "items";
  }
}

// Singleton instance
let _integrationRegistryService: IntegrationRegistryService | null = null;

export function getIntegrationRegistryService(): IntegrationRegistryService {
  if (!_integrationRegistryService) {
    _integrationRegistryService = new IntegrationRegistryService();
  }
  return _integrationRegistryService;
}

export function resetIntegrationRegistryService(): void {
  _integrationRegistryService = null;
}
