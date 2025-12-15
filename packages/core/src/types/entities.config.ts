import type { EntityType } from "./entities";
import { VALID_ENTITY_TYPES } from "./entities";

export type IntegrationVendor = "spotify" | "github" | "linear" | "x" | "notion" | "slack" | "google";

export interface EntityMetadata {
  label: string;
  labelPlural: string;
  keywords: readonly string[];
  vendor: IntegrationVendor;
  description: string;
  timestampFields: readonly string[];
}

export const ENTITY_METADATA: Record<EntityType, EntityMetadata> = {
  // Spotify entities
  track: {
    label: "Song",
    labelPlural: "Songs",
    keywords: ["track", "song", "music", "spotify", "listening", "playing", "played"],
    vendor: "spotify",
    description: "Spotify tracks in library (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  artist: {
    label: "Artist",
    labelPlural: "Artists",
    keywords: ["artist", "musician", "band", "spotify", "follow"],
    vendor: "spotify",
    description: "Spotify artists followed (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  playlist: {
    label: "Playlist",
    labelPlural: "Playlists",
    keywords: ["playlist", "spotify", "collection", "music"],
    vendor: "spotify",
    description: "Spotify playlists (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  album: {
    label: "Album",
    labelPlural: "Albums",
    keywords: ["album", "spotify", "record", "music"],
    vendor: "spotify",
    description: "Spotify albums (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  recently_played: {
    label: "Recently Played",
    labelPlural: "Recently Played",
    keywords: ["recently played", "listening", "played", "spotify", "history"],
    vendor: "spotify",
    description: "Spotify tracks that were actually played (timestamps: playedAt - THE ACTUAL PLAY TIME)",
    timestampFields: ["playedAt"],
  },

  // GitHub entities
  repository: {
    label: "Repository",
    labelPlural: "Repositories",
    keywords: ["repo", "repository", "source", "code", "git", "github", "commit"],
    vendor: "github",
    description: "GitHub repositories (timestamps: pushedAt)",
    timestampFields: ["pushedAt", "createdAt", "updatedAt"],
  },
  pull_request: {
    label: "Pull Request",
    labelPlural: "Pull Requests",
    keywords: ["pull request", "pr", "merge", "code", "github", "git"],
    vendor: "github",
    description: "GitHub pull requests (timestamps: mergedAt, closedAt)",
    timestampFields: ["mergedAt", "closedAt", "createdAt", "updatedAt"],
  },
  commit: {
    label: "Commit",
    labelPlural: "Commits",
    keywords: ["commit", "code change", "git", "github", "diff"],
    vendor: "github",
    description: "GitHub commits with diffs and file changes (timestamps: authorDate, committerDate)",
    timestampFields: ["authorDate", "committerDate", "createdAt", "updatedAt"],
  },
  repository_file: {
    label: "Code File",
    labelPlural: "Code Files",
    keywords: ["file", "code", "source", "implementation", "class", "function", "module", "github"],
    vendor: "github",
    description: "Repository source code files (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // Linear entities
  issue: {
    label: "Issue",
    labelPlural: "Issues",
    keywords: ["issue", "task", "ticket", "project", "kanban", "bug", "linear"],
    vendor: "linear",
    description: "Linear issues (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // X (Twitter) entities
  tweet: {
    label: "Tweet",
    labelPlural: "Tweets",
    keywords: ["tweet", "microblog", "twitter", "x.com", "x", "posted", "retweeted", "social"],
    vendor: "x",
    description: "Twitter/X posts (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },

  // Notion entities
  page: {
    label: "Page",
    labelPlural: "Pages",
    keywords: ["page", "notion", "note", "document", "wiki", "knowledge", "docs"],
    vendor: "notion",
    description: "Notion pages and notes (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // Slack entities
  message: {
    label: "Message",
    labelPlural: "Messages",
    keywords: ["message", "slack", "channel", "team", "team communication", "team updates"],
    vendor: "slack",
    description: "Slack messages (timestamps: createdAt, updatedAt)",
    timestampFields: ["createdAt", "updatedAt"],
  },

  // Google entities (Calendar, Drive, etc.)
  event: {
    label: "Event",
    labelPlural: "Events",
    keywords: ["calendar", "event", "meeting", "schedule", "appointment", "google calendar", "invite"],
    vendor: "google",
    description: "Google Calendar events and meetings (timestamps: startTime, endTime, createdAt)",
    timestampFields: ["startTime", "endTime", "createdAt"],
  },
  calendar: {
    label: "Calendar",
    labelPlural: "Calendars",
    keywords: ["calendar", "google calendar", "schedule", "agenda"],
    vendor: "google",
    description: "Google Calendar calendars (timestamps: createdAt)",
    timestampFields: ["createdAt"],
  },
  subscription: {
    label: "Subscription",
    labelPlural: "Subscriptions",
    keywords: ["subscription", "youtube", "channel", "video", "subscribe", "following"],
    vendor: "google",
    description: "YouTube channel subscriptions (timestamps: publishedAt)",
    timestampFields: ["publishedAt"],
  },
} as const;

export function getEntityMetadata(entityType: EntityType): EntityMetadata {
  return ENTITY_METADATA[entityType];
}

export function getEntityTypesByVendor(vendor: IntegrationVendor): EntityType[] {
  return VALID_ENTITY_TYPES.filter((type) => ENTITY_METADATA[type].vendor === vendor);
}

export function getEntityKeywords(entityType: EntityType): readonly string[] {
  return ENTITY_METADATA[entityType].keywords;
}

export function getVendorKeywords(vendor: IntegrationVendor): readonly string[] {
  const keywords: string[] = [];
  for (const type of getEntityTypesByVendor(vendor)) {
    keywords.push(...ENTITY_METADATA[type].keywords);
  }
  return keywords;
}

export function findEntityTypesByKeywords(keywords: string[]): EntityType[] {
  const keywordSet = new Set(keywords.map((k) => k.toLowerCase()));
  const matchingTypes: EntityType[] = [];

  for (const [type, metadata] of Object.entries(ENTITY_METADATA)) {
    if (metadata.keywords.some((kw) => keywordSet.has(kw.toLowerCase()))) {
      matchingTypes.push(type as EntityType);
    }
  }

  return matchingTypes;
}

export function getEntityLabel(entityType: EntityType, plural = false): string {
  const metadata = ENTITY_METADATA[entityType];
  return plural ? metadata.labelPlural : metadata.label;
}

export function getEntityDescriptions(): string {
  return VALID_ENTITY_TYPES.map((type) => {
    const meta = ENTITY_METADATA[type];
    return `- ${type}: ${meta.description}`;
  }).join("\n");
}
