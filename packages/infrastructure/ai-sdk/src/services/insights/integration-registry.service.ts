import { getLogger } from "@ait/core";

// Define ConnectorType locally to avoid dependency on @ait/connectors
// This matches the type from @ait/connectors
export type ConnectorType = "github" | "linear" | "spotify" | "x" | "notion" | "slack" | "google";

const logger = getLogger();

/**
 * Integration metadata for activity tracking
 */
export interface IntegrationMetadata {
  connectorType: ConnectorType;
  displayName: string;
  primaryEntityType: string;
  dateField: string; // Field name to extract date from entity
  goalType?: string; // Goal type mapping (e.g., "commits", "songs", "messages")
  fetchMethod: string; // Method name on connector service to fetch entities
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
      dateField: "authorDate",
      goalType: "commits",
      fetchMethod: "getCommitsPaginated",
    },
    linear: {
      connectorType: "linear",
      displayName: "Linear",
      primaryEntityType: "issue",
      dateField: "updatedAt",
      goalType: "tasks",
      fetchMethod: "getIssuesPaginated",
    },
    spotify: {
      connectorType: "spotify",
      displayName: "Spotify",
      primaryEntityType: "recently_played",
      dateField: "playedAt",
      goalType: "songs",
      fetchMethod: "getRecentlyPlayedPaginated",
    },
    x: {
      connectorType: "x",
      displayName: "X (Twitter)",
      primaryEntityType: "tweet",
      dateField: "createdAt",
      goalType: "tweets",
      fetchMethod: "getTweetsPaginated",
    },
    notion: {
      connectorType: "notion",
      displayName: "Notion",
      primaryEntityType: "page",
      dateField: "updatedAt",
      goalType: "documents",
      fetchMethod: "getPagesPaginated",
    },
    slack: {
      connectorType: "slack",
      displayName: "Slack",
      primaryEntityType: "message",
      dateField: "createdAt", // Use createdAt instead of ts for better compatibility
      goalType: "messages",
      fetchMethod: "getMessagesPaginated",
    },
    google: {
      connectorType: "google",
      displayName: "Google",
      primaryEntityType: "event",
      dateField: "startTime",
      goalType: "events",
      fetchMethod: "getEventsPaginated",
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
   * Extract date from an entity based on connector type and date field
   */
  extractDate(entity: any, connectorType: ConnectorType): Date | null {
    const metadata = this.getMetadata(connectorType);
    if (!metadata) {
      logger.warn("Unknown connector type for date extraction", { connectorType });
      return null;
    }

    const fieldValue = entity[metadata.dateField];

    // Handle null/undefined
    if (fieldValue === null || fieldValue === undefined) {
      return null;
    }

    // Handle different date field formats
    if (metadata.dateField === "ts") {
      // Slack uses Unix timestamp as string (e.g., "1234567890.123456")
      if (typeof fieldValue === "string") {
        const timestamp = Number.parseFloat(fieldValue);
        if (!Number.isNaN(timestamp) && timestamp > 0) {
          // Handle both seconds and milliseconds
          const ms = timestamp > 1e10 ? timestamp : timestamp * 1000;
          return new Date(ms);
        }
      } else if (typeof fieldValue === "number") {
        // Handle numeric timestamp
        const ms = fieldValue > 1e10 ? fieldValue : fieldValue * 1000;
        return new Date(ms);
      }
      return null;
    }

    // Handle Date objects (direct or serialized)
    if (fieldValue instanceof Date) {
      return fieldValue;
    }

    // Handle string dates (ISO format or other)
    if (typeof fieldValue === "string") {
      // Try parsing as ISO date string
      const date = new Date(fieldValue);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    // Handle numeric timestamps (milliseconds)
    if (typeof fieldValue === "number" && fieldValue > 0) {
      return new Date(fieldValue);
    }

    return null;
  }

  /**
   * Get goal type for a connector type
   */
  getGoalType(connectorType: ConnectorType): string | null {
    const metadata = this.getMetadata(connectorType);
    return metadata?.goalType || null;
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
