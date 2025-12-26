import { ENTITY_METADATA, type EntityType, type IntegrationVendor, SUPPORTED_VENDORS, getLogger } from "@ait/core";
import type { IntegrationVendorWithYoutube } from "@ait/store";

const logger = getLogger();

export interface EntityFetchConfig {
  entityType: EntityType;
  fetchMethod: string;
  dateField: string | string[];
}

export class IntegrationRegistryService {
  private static readonly FETCH_CONFIGS: Partial<Record<EntityType, EntityFetchConfig>> = {
    repository: {
      entityType: "repository",
      fetchMethod: "getRepositoriesPaginated",
      dateField: ["updatedAt", "pushedAt", "createdAt"],
    },
    pull_request: {
      entityType: "pull_request",
      fetchMethod: "getPullRequestsPaginated",
      dateField: ["updatedAt", "prUpdatedAt", "createdAt", "prCreatedAt"],
    },
    commit: {
      entityType: "commit",
      fetchMethod: "getCommitsPaginated",
      dateField: ["committerDate", "authorDate", "updatedAt", "createdAt"],
    },
    repository_file: { entityType: "repository_file", fetchMethod: "getFilesPaginated", dateField: "updatedAt" },
    issue: { entityType: "issue", fetchMethod: "getIssuesPaginated", dateField: ["updatedAt", "createdAt"] },
    track: { entityType: "track", fetchMethod: "getTracksPaginated", dateField: "updatedAt" },
    artist: { entityType: "artist", fetchMethod: "getArtistsPaginated", dateField: "updatedAt" },
    playlist: { entityType: "playlist", fetchMethod: "getPlaylistsPaginated", dateField: "updatedAt" },
    album: { entityType: "album", fetchMethod: "getAlbumsPaginated", dateField: "updatedAt" },
    recently_played: {
      entityType: "recently_played",
      fetchMethod: "getRecentlyPlayedPaginated",
      dateField: "playedAt",
    },
    tweet: { entityType: "tweet", fetchMethod: "getTweetsPaginated", dateField: "createdAt" },
    page: { entityType: "page", fetchMethod: "getPagesPaginated", dateField: "updatedAt" },
    message: { entityType: "message", fetchMethod: "getMessagesPaginated", dateField: ["ts", "createdAt"] },
    event: { entityType: "event", fetchMethod: "getEventsPaginated", dateField: "startTime" },
    calendar: { entityType: "calendar", fetchMethod: "getCalendarsPaginated", dateField: "updatedAt" },
    subscription: { entityType: "subscription", fetchMethod: "getSubscriptionsPaginated", dateField: "publishedAt" },
  };

  getAvailableVendors(): IntegrationVendor[] {
    return SUPPORTED_VENDORS as unknown as IntegrationVendor[];
  }

  getEntitiesByVendor(vendor: IntegrationVendor): EntityType[] {
    return Object.entries(ENTITY_METADATA)
      .filter(([_, meta]) => meta.vendor === vendor)
      .map(([type]) => type as EntityType);
  }

  getFetchConfig(entityType: EntityType): EntityFetchConfig | null {
    const config = IntegrationRegistryService.FETCH_CONFIGS[entityType];
    if (!config) {
      logger.warn(`[IntegrationRegistry] No fetch config found for entity type: ${entityType}`);
      return null;
    }
    return config;
  }

  getVendorDisplayName(vendor: IntegrationVendor): string {
    const displayNames: Record<IntegrationVendorWithYoutube, string> = {
      github: "GitHub",
      linear: "Linear",
      spotify: "Spotify",
      x: "X (Twitter)",
      notion: "Notion",
      slack: "Slack",
      google: "Google",
      youtube: "YouTube",
    };
    return displayNames[vendor] || vendor;
  }

  extractDateFromEntity(entity: any, dateField: string | string[]): Date | null {
    const fields = Array.isArray(dateField) ? dateField : [dateField];

    for (const field of fields) {
      const value = entity[field];
      if (value === null || value === undefined) continue;

      // Handle Slack Unix timestamps
      if (field === "ts" && typeof value === "string") {
        const ts = Number.parseFloat(value);
        if (!Number.isNaN(ts)) return new Date(ts * 1000);
      }

      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }

    logger.warn(`[IntegrationRegistry] Failed to extract date from entity for fields: ${fields.join(", ")}`, {
      entity: typeof entity === "object" ? JSON.stringify(entity).slice(0, 100) : entity,
    });
    return null;
  }

  getUnitLabel(vendor: IntegrationVendorWithYoutube): string {
    const units: Record<IntegrationVendorWithYoutube, string> = {
      spotify: "songs",
      github: "commits",
      slack: "messages",
      x: "tweets",
      linear: "tasks",
      notion: "documents",
      google: "events",
      youtube: "subscriptions",
    };
    return units[vendor] || "items";
  }

  getActivityLabel(vendor: IntegrationVendorWithYoutube): string {
    const labels: Record<IntegrationVendorWithYoutube, string> = {
      spotify: "music listening",
      github: "coding",
      slack: "team communication",
      x: "social media activity",
      linear: "task management",
      notion: "documentation",
      google: "calendar events",
      youtube: "video subscriptions",
    };
    return labels[vendor] || vendor;
  }
}

let instance: IntegrationRegistryService | null = null;

export function getIntegrationRegistryService(): IntegrationRegistryService {
  if (!instance) instance = new IntegrationRegistryService();
  return instance;
}

export function resetIntegrationRegistryService(): void {
  instance = null;
}
