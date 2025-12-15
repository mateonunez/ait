export function getEntityDate(entity: Record<string, any>): Date | null {
  if (!entity) return null;

  if (entity.startTime) return new Date(entity.startTime); // Google Calendar
  if (entity.playedAt) return new Date(entity.playedAt); // Spotify Recently Played
  if (entity.mergedAt) return new Date(entity.mergedAt); // GitHub PR
  if (entity.closedAt) return new Date(entity.closedAt); // GitHub Issue/PR
  if (entity.committerDate) return new Date(entity.committerDate); // GitHub Commit
  if (entity.publishedAt) return new Date(entity.publishedAt); // YouTube / Generic

  if (entity.createdAt) return new Date(entity.createdAt); // Notion, Linear, Generic
  if (entity.addedAt) return new Date(entity.addedAt); // Spotify Library
  if (entity.authorDate) return new Date(entity.authorDate); // GitHub Author
  if (entity.eventCreatedAt) return new Date(entity.eventCreatedAt); // Calendar Metadata
  if (entity.timestamp) return new Date(entity.timestamp); // Generic
  if (entity.date) return new Date(entity.date); // Generic

  if (entity.updatedAt) return new Date(entity.updatedAt);

  return null;
}
