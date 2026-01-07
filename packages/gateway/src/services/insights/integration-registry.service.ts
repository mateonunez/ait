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
    github_repository: {
      entityType: "github_repository",
      fetchMethod: "getRepositoriesPaginated",
      dateField: ["updatedAt", "pushedAt", "createdAt"],
    },
    github_pull_request: {
      entityType: "github_pull_request",
      fetchMethod: "getPullRequestsPaginated",
      dateField: ["updatedAt", "prUpdatedAt", "createdAt", "prCreatedAt"],
    },
    github_commit: {
      entityType: "github_commit",
      fetchMethod: "getCommitsPaginated",
      dateField: ["committerDate", "authorDate", "updatedAt", "createdAt"],
    },
    github_file: { entityType: "github_file", fetchMethod: "getFilesPaginated", dateField: "updatedAt" },

    linear_issue: {
      entityType: "linear_issue",
      fetchMethod: "getIssuesPaginated",
      dateField: ["updatedAt", "createdAt"],
    },

    spotify_track: { entityType: "spotify_track", fetchMethod: "getTracksPaginated", dateField: "updatedAt" },
    spotify_artist: { entityType: "spotify_artist", fetchMethod: "getArtistsPaginated", dateField: "updatedAt" },
    spotify_playlist: { entityType: "spotify_playlist", fetchMethod: "getPlaylistsPaginated", dateField: "updatedAt" },
    spotify_album: { entityType: "spotify_album", fetchMethod: "getAlbumsPaginated", dateField: "updatedAt" },
    spotify_recently_played: {
      entityType: "spotify_recently_played",
      fetchMethod: "getRecentlyPlayedPaginated",
      dateField: "playedAt",
    },

    x_tweet: { entityType: "x_tweet", fetchMethod: "getTweetsPaginated", dateField: "createdAt" },

    notion_page: { entityType: "notion_page", fetchMethod: "getPagesPaginated", dateField: "updatedAt" },

    slack_message: { entityType: "slack_message", fetchMethod: "getMessagesPaginated", dateField: ["ts", "createdAt"] },

    google_calendar_event: {
      entityType: "google_calendar_event",
      fetchMethod: "getEventsPaginated",
      dateField: "startTime",
    },
    google_calendar_calendar: {
      entityType: "google_calendar_calendar",
      fetchMethod: "getCalendarsPaginated",
      dateField: "updatedAt",
    },

    google_youtube_subscription: {
      entityType: "google_youtube_subscription",
      fetchMethod: "getSubscriptionsPaginated",
      dateField: "publishedAt",
    },
    google_contact: {
      entityType: "google_contact",
      fetchMethod: "getContactsPaginated",
      dateField: "updatedAt",
    },
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

  extractDateFromEntity(entity: Record<string, unknown> | null, dateField: string | string[]): Date | null {
    const fields = Array.isArray(dateField) ? dateField : [dateField];

    for (const field of fields) {
      if (!entity) continue;
      const value = entity[field] as string | number | null | undefined;
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
      google: "items",
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
      google: "calendar and contacts activity",
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
