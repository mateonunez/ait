/**
 * Format relative time (e.g., "5h ago", "in 2d")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const isFuture = diffMs < 0;
  const seconds = Math.floor(Math.abs(diffMs) / 1000);

  if (seconds < 60) return isFuture ? "in a moment" : "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return isFuture ? `in ${minutes}m` : `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isFuture ? `in ${hours}h` : `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return isFuture ? `in ${days}d` : `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return isFuture ? `in ${months}mo` : `${months}mo ago`;

  const years = Math.floor(months / 12);
  return isFuture ? `in ${years}y` : `${years}y ago`;
}

/**
 * Format date as friendly string (e.g., "Today", "Yesterday", "3 days ago")
 */
export function formatFriendlyDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";

  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

/**
 * Format duration from milliseconds (e.g., "3:42")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Format large numbers (e.g., "1.5K", "2.3M")
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";

  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }

  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }

  return num.toString();
}

/**
 * Extract JSON object from text containing other content
 */
export function extractJson(text: string): string | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const candidate = text.slice(firstBrace, lastBrace + 1);
  return candidate.trim().length ? candidate : null;
}

/**
 * Extract date from various entity types with different date field names.
 * Handles Google Calendar, Spotify, GitHub, Linear, Notion, YouTube, etc.
 */
export function getEntityDate(entity: any): Date | null {
  if (!entity) return null;

  if (entity.startTime) return new Date(entity.startTime as string); // Google Calendar
  if (entity.playedAt) return new Date(entity.playedAt as string); // Spotify Recently Played
  if (entity.mergedAt) return new Date(entity.mergedAt as string); // GitHub PR
  if (entity.closedAt) return new Date(entity.closedAt as string); // GitHub Issue/PR
  if (entity.committerDate) return new Date(entity.committerDate as string); // GitHub Commit
  if (entity.publishedAt) return new Date(entity.publishedAt as string); // YouTube / Generic

  if (entity.createdAt) return new Date(entity.createdAt as string); // Notion, Linear, Generic
  if (entity.addedAt) return new Date(entity.addedAt as string); // Spotify Library
  if (entity.authorDate) return new Date(entity.authorDate as string); // GitHub Author
  if (entity.eventCreatedAt) return new Date(entity.eventCreatedAt as string); // Calendar Metadata
  if (entity.timestamp) return new Date(entity.timestamp as string); // Generic
  if (entity.date) return new Date(entity.date as string); // Generic

  if (entity.updatedAt) return new Date(entity.updatedAt as string);

  return null;
}
