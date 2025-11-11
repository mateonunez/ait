import { randomUUID } from "node:crypto";
import type { Document, BaseMetadata } from "../../types/documents";
import { buildTitleFromMetadata } from "../../types/context";
import type {
  SpotifyTrackEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyAlbumEntity,
  GitHubRepositoryEntity,
  XTweetEntity,
  LinearIssueEntity,
  SpotifyRecentlyPlayedEntity,
} from "@ait/connectors";
import type { GitHubPullRequestEntity } from "@ait/connectors";
import type { TemporalCluster } from "../filtering/temporal-correlation.service";

type EntityType =
  | "track"
  | "artist"
  | "playlist"
  | "album"
  | "recently_played"
  | "repository"
  | "pull_request"
  | "tweet"
  | "issue";

type EntityContentBuilder<T = BaseMetadata> = (meta: T, pageContent: string) => string;

type TextPart = string | null | undefined;

const safeString = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);

const safeNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);

const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

const extractArtistName = (artists: unknown[]): string => {
  if (artists.length === 0) return "Unknown Artist";
  const first = artists[0];
  if (typeof first === "string") return first;
  if (typeof first === "object" && first !== null && "name" in first && typeof first.name === "string") {
    return first.name;
  }
  return "Unknown Artist";
};

const formatDate = (date: unknown): string | null => {
  if (!date) return null;
  try {
    return new Date(date as string | number | Date).toLocaleDateString();
  } catch {
    return null;
  }
};

const truncate = (text: string, maxLength: number): string =>
  text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;

const joinParts = (...parts: TextPart[]): string => parts.filter((p): p is string => Boolean(p)).join("");

const buildSpotifyTrack: EntityContentBuilder<SpotifyTrackEntity> = (meta) => {
  const name = safeString(meta.name, "Unknown Track");
  const artist = safeString(meta.artist, "Unknown Artist");
  const album = meta.album && meta.album !== name ? meta.album : null;
  const popularity = safeNumber(meta.popularity);
  const explicit = meta.explicit ? " [Explicit]" : "";

  return joinParts(
    `Track: "${name}" by ${artist}`,
    album ? ` from the album "${album}"` : null,
    popularity !== null ? ` (popularity: ${popularity}/100)` : null,
    explicit,
  );
};

const buildSpotifyArtist: EntityContentBuilder<SpotifyArtistEntity> = (meta) => {
  const name = safeString(meta.name, "Unknown Artist");
  const genres = safeArray<string>(meta.genres)
    .filter((g) => typeof g === "string")
    .slice(0, 3);
  const popularity = safeNumber(meta.popularity);

  return joinParts(
    `I follow ${name}`,
    genres.length > 0 ? `, exploring ${genres.join(", ")}` : null,
    popularity !== null ? ` (popularity: ${popularity}/100)` : null,
  );
};

const buildSpotifyPlaylist: EntityContentBuilder<SpotifyPlaylistEntity> = (meta) => {
  const name = safeString(meta.name, "Unnamed Playlist");
  const description = safeString(meta.description);
  const trackCount = safeArray(meta.tracks).length;

  return joinParts(
    `Playlist: "${name}"`,
    description ? ` - ${description}` : null,
    trackCount > 0 ? ` (${trackCount} tracks)` : null,
  );
};

const buildSpotifyAlbum: EntityContentBuilder<SpotifyAlbumEntity> = (meta) => {
  const name = safeString(meta.name, "Unknown Album");
  const artists = safeArray(meta.artists);
  const artistName = extractArtistName(artists);
  const releaseDate = safeString(meta.releaseDate);
  const totalTracks = safeNumber(meta.totalTracks);

  return joinParts(
    `Album: "${name}" by ${artistName}`,
    releaseDate ? ` (${releaseDate})` : null,
    totalTracks !== null ? `, ${totalTracks} tracks` : null,
  );
};

const buildSpotifyRecentlyPlayed: EntityContentBuilder<SpotifyRecentlyPlayedEntity> = (meta) => {
  const trackName = safeString(meta.trackName, "Unknown Track");
  const artist = safeString(meta.artist, "Unknown Artist");
  const album = safeString(meta.album);
  const duration = safeNumber(meta.durationMs);
  const explicit = meta.explicit ? " [Explicit]" : "";
  const popularity = safeNumber(meta.popularity);
  const durationFormatted = duration
    ? `${Math.floor(duration / 60000)}:${String(Math.floor((duration % 60000) / 1000)).padStart(2, "0")}`
    : null;
  const vibeTag =
    popularity !== null && popularity >= 70
      ? " popular track"
      : popularity !== null && popularity <= 30
        ? " niche track"
        : "";

  return joinParts(
    `I played "${trackName}" by ${artist}`,
    album ? ` from ${album}` : null,
    durationFormatted ? ` (${durationFormatted})` : null,
    explicit,
    vibeTag,
  );
};

const buildGitHubRepository: EntityContentBuilder<GitHubRepositoryEntity> = (meta) => {
  const name = safeString(meta.fullName || meta.name, "Unknown Repository");
  const description = safeString(meta.description);
  const language = safeString(meta.language);
  const stars = safeNumber(meta.stars);
  const forks = safeNumber(meta.forks);
  const watchers = safeNumber(meta.watchersCount);
  const openIssues = safeNumber(meta.openIssuesCount);

  // Build comprehensive stats
  const stats: string[] = [];
  if (stars !== null) stats.push(`${stars} star${stars === 1 ? "" : "s"}`);
  if (forks !== null) stats.push(`${forks} fork${forks === 1 ? "" : "s"}`);
  if (watchers !== null && watchers > 0) stats.push(`${watchers} watcher${watchers === 1 ? "" : "s"}`);
  if (openIssues !== null) stats.push(`${openIssues} open issue${openIssues === 1 ? "" : "s"}`);

  // Build status indicators
  const statusParts: string[] = [];
  if (meta.archived) statusParts.push("archived");
  if (meta.private) statusParts.push("private");
  if (meta.fork) statusParts.push("fork");
  if (meta.isTemplate) statusParts.push("template");

  // Build features
  const features: string[] = [];
  if (meta.hasWiki) features.push("wiki");
  if (meta.hasDiscussions) features.push("discussions");
  if (meta.hasPages) features.push("GitHub Pages");

  // Build topics
  const topics = meta.topics && meta.topics.length > 0 ? `Topics: ${meta.topics.slice(0, 5).join(", ")}` : null;

  // Build license
  const license = meta.licenseName ? `License: ${meta.licenseName}` : null;

  return joinParts(
    `Repository: "${name}"`,
    statusParts.length > 0 ? ` [${statusParts.join(", ")}]` : null,
    description ? ` - ${description}` : null,
    language ? ` (${language})` : null,
    stats.length > 0 ? `. Stats: ${stats.join(", ")}` : null,
    features.length > 0 ? `. Features: ${features.join(", ")}` : null,
    topics ? `. ${topics}` : null,
    license ? `. ${license}` : null,
  );
};

const buildGitHubPullRequest: EntityContentBuilder<GitHubPullRequestEntity> = (meta) => {
  const number = safeNumber(meta.number);
  const title = safeString(meta.title, "Unnamed PR");
  const state = safeString(meta.state);
  const merged = meta.merged ? "merged" : null;
  const draft = meta.draft ? "draft" : null;
  const repositoryName = safeString(meta.repositoryFullName || meta.repositoryName);
  const body = safeString(meta.body);

  // Build stats
  const stats: string[] = [];
  const additions = safeNumber(meta.additions);
  const deletions = safeNumber(meta.deletions);
  if (additions !== null || deletions !== null) {
    stats.push(`+${additions ?? 0}/-${deletions ?? 0}`);
  }

  const changedFiles = safeNumber(meta.changedFiles);
  if (changedFiles !== null && changedFiles > 0) {
    stats.push(`${changedFiles} file${changedFiles === 1 ? "" : "s"}`);
  }

  const commits = safeNumber(meta.commits);
  if (commits !== null && commits > 0) {
    stats.push(`${commits} commit${commits === 1 ? "" : "s"}`);
  }

  // Build action verb based on state
  let action = "I worked on PR";
  if (merged) action = "I merged PR";
  else if (state === "closed" && !merged) action = "I closed PR";
  else if (draft) action = "I drafted PR";
  else if (state === "open") action = "I opened PR";

  // Build repository context
  const repoContext = repositoryName ? ` in \`${repositoryName}\`` : "";

  // Include truncated body if available
  const bodyPreview = body && body.length > 0 ? `\nDescription: ${truncate(body, 150)}` : "";

  return joinParts(
    `${action} #${number ?? "?"}${repoContext}`,
    `: "${title}"`,
    stats.length > 0 ? `. Changes: ${stats.join(", ")}` : null,
    bodyPreview,
  );
};

const buildXTweet: EntityContentBuilder<XTweetEntity> = (meta, pageContent) => {
  const text = safeString(meta.text || pageContent, "");
  const retweetCount = safeNumber(meta.retweetCount);
  const likeCount = safeNumber(meta.likeCount);
  const replyCount = safeNumber(meta.replyCount);
  const authorName = safeString(meta.authorName);
  const authorUsername = safeString(meta.authorUsername);

  const engagement: string[] = [];
  if (retweetCount !== null && retweetCount > 0) engagement.push(`${retweetCount} retweets`);
  if (likeCount !== null && likeCount > 0) engagement.push(`${likeCount} likes`);
  if (replyCount !== null && replyCount > 0) engagement.push(`${replyCount} replies`);

  const authorInfo = authorName || authorUsername ? ` (@${authorUsername || authorName})` : "";

  return joinParts(`I tweeted${authorInfo}: ${text}`, engagement.length > 0 ? ` (${engagement.join(", ")})` : null);
};

const buildLinearIssue: EntityContentBuilder<LinearIssueEntity> = (meta) => {
  const title = safeString(meta.title, "Unnamed Issue");
  const description = safeString(meta.description);
  const state = safeString(meta.state);
  const priority = safeNumber(meta.priority);
  const labels = safeArray<string>(meta.labels);
  const assigneeName = safeString(meta.assigneeName);
  const teamName = safeString(meta.teamName);
  const projectName = safeString(meta.projectName);

  const priorityLabels: Record<number, string> = {
    0: "Urgent",
    1: "High",
    2: "Medium",
    3: "Low",
    4: "No priority",
  };
  const priorityLabel = priority !== null ? priorityLabels[priority] || `Priority ${priority}` : null;

  const parts: string[] = [`Issue: "${title}"`];
  if (state) parts.push(` [${state}]`);
  if (teamName) parts.push(` in ${teamName}`);
  if (priorityLabel) parts.push(` (${priorityLabel})`);
  if (assigneeName) parts.push(`, assigned to ${assigneeName}`);
  if (projectName) parts.push(`, project: ${projectName}`);
  if (description) parts.push(`\n${truncate(description, 200)}`);
  if (labels.length > 0) parts.push(`\nLabels: ${labels.join(", ")}`);

  return parts.join("");
};

const entityBuilders: Record<EntityType, EntityContentBuilder<any>> = {
  track: buildSpotifyTrack,
  artist: buildSpotifyArtist,
  playlist: buildSpotifyPlaylist,
  album: buildSpotifyAlbum,
  recently_played: buildSpotifyRecentlyPlayed,
  repository: buildGitHubRepository,
  pull_request: buildGitHubPullRequest,
  tweet: buildXTweet,
  issue: buildLinearIssue,
};

const cleanPageContent = (content: string): string => {
  return content
    .replace(/\{[^}]*\}/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const isNaturalText = (text: string): boolean => text.length > 10 && !text.includes("{") && !text.includes("http");

export class ContextBuilder {
  private buildNaturalContent(doc: Document<BaseMetadata>): string {
    const meta = doc.metadata;

    const originalText = safeString(meta.originalText);
    if (originalText && isNaturalText(originalText)) {
      return originalText;
    }

    const entityType = meta.__type as EntityType | undefined;
    const builder = entityType ? entityBuilders[entityType] : null;

    if (builder) {
      return builder(meta, doc.pageContent);
    }

    const cleaned = cleanPageContent(doc.pageContent);
    return cleaned || `${meta.__type || "Document"}: ${meta.id}`;
  }

  /**
   * Build temporally-aware context from clusters of documents grouped by time
   */
  public buildTemporalContext(clusters: TemporalCluster[]): string {
    if (clusters.length === 0) {
      return "";
    }

    const sections: string[] = [];

    for (const cluster of clusters) {
      // Build a human-readable time label
      const timeLabel = this._buildTimeLabel(cluster.centerTimestamp, cluster.timeWindow);

      // Group entities by type within this cluster
      const entityGroups = this._groupEntitiesByType(cluster.entities);

      // Build content for this time cluster
      const clusterContent: string[] = [];

      for (const [entityType, entities] of Object.entries(entityGroups)) {
        const entityLabels = this._getEntityTypeLabel(entityType);

        for (const entity of entities) {
          const naturalContent = this.buildNaturalContent(entity.document);
          const header = buildTitleFromMetadata(entity.metadata);
          clusterContent.push(`#### ${header}\n${naturalContent}`);
        }
      }

      if (clusterContent.length > 0) {
        sections.push(`### ${timeLabel}\n\n${clusterContent.join("\n\n")}`);
      }
    }

    return sections.join("\n\n");
  }

  private _buildTimeLabel(centerTime: Date, window: { start: Date; end: Date }): string {
    const now = new Date();
    const diffMs = now.getTime() - centerTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Format the date
    const dateStr = centerTime.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });

    // Add time of day context if within the same day
    const timeOfDay = this._getTimeOfDay(centerTime);

    // Create relative time label
    let relativeLabel = "";
    if (diffMinutes < 60) {
      relativeLabel = `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      relativeLabel = `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      relativeLabel = `${diffDays} days ago`;
    } else {
      relativeLabel = dateStr;
    }

    // If there's a significant time span in the window, note it
    const windowSpanHours = (window.end.getTime() - window.start.getTime()) / (1000 * 60 * 60);

    if (windowSpanHours > 0.5) {
      return `${dateStr} ${timeOfDay} (${relativeLabel})`;
    }

    return `${dateStr} ${timeOfDay}`;
  }

  private _getTimeOfDay(date: Date): string {
    const hours = date.getHours();

    if (hours < 6) return "(night)";
    if (hours < 12) return "(morning)";
    if (hours < 17) return "(afternoon)";
    if (hours < 21) return "(evening)";
    return "(night)";
  }

  private _groupEntitiesByType(
    entities: Array<{ type: string; metadata: BaseMetadata; document: Document<BaseMetadata> }>,
  ) {
    const groups: Record<string, typeof entities> = {};

    for (const entity of entities) {
      const type = entity.type || "unknown";
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(entity);
    }

    return groups;
  }

  private _getEntityTypeLabel(entityType: string): string {
    const labels: Record<string, string> = {
      tweet: "Tweets",
      track: "Songs",
      recently_played: "Recently Played",
      repository: "Repositories",
      pull_request: "Pull Requests",
      issue: "Issues",
      playlist: "Playlists",
      album: "Albums",
      artist: "Artists",
    };

    return labels[entityType] || entityType;
  }

  public buildContextFromDocuments(documents: Document<BaseMetadata>[]): string {
    const entityMap = new Map<string, string>();
    const metadataMap = new Map<string, BaseMetadata>();

    for (const doc of documents) {
      const entityId = doc.metadata.id || randomUUID();
      const naturalContent = this.buildNaturalContent(doc);

      // Merge content for duplicate entities
      const existing = entityMap.get(entityId);
      if (existing && !existing.includes(naturalContent)) {
        entityMap.set(entityId, `${existing}\n${naturalContent}`);
      } else if (!existing) {
        entityMap.set(entityId, naturalContent);
      }

      metadataMap.set(entityId, doc.metadata);
    }

    const contextFromDocuments = Array.from(entityMap.entries())
      .map(([id, content]) => {
        const meta = metadataMap.get(id);
        if (!meta) return "";

        const header = buildTitleFromMetadata(meta);
        return `### ${header}\n${content}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return contextFromDocuments;
  }

  public buildContextWithScores(documents: Array<{ doc: Document<BaseMetadata>; score: number }>): {
    context: string;
    scoreInfo: string;
  } {
    const entityMap = new Map<string, { content: string; score: number }>();
    const metadataMap = new Map<string, BaseMetadata>();

    for (const { doc, score } of documents) {
      const entityId = doc.metadata.id || randomUUID();
      const naturalContent = this.buildNaturalContent(doc);
      const existing = entityMap.get(entityId);

      if (existing) {
        // Merge content and keep highest score
        const mergedContent = existing.content.includes(naturalContent)
          ? existing.content
          : `${existing.content}\n${naturalContent}`;

        entityMap.set(entityId, {
          content: mergedContent,
          score: Math.max(existing.score, score),
        });
      } else {
        entityMap.set(entityId, { content: naturalContent, score });
      }

      metadataMap.set(entityId, doc.metadata);
    }

    const contextFromDocuments = Array.from(entityMap.entries())
      .map(([id, { content }]) => {
        const meta = metadataMap.get(id);
        if (!meta) return "";

        const header = buildTitleFromMetadata(meta);
        return `### ${header}\n${content}`;
      })
      .filter(Boolean)
      .join("\n\n");

    const scoreInfo = Array.from(entityMap.entries())
      .map(([id, { score }]) => {
        const meta = metadataMap.get(id);
        if (!meta) return "";

        return `${buildTitleFromMetadata(meta)}: ${score.toFixed(4)}`;
      })
      .filter(Boolean)
      .join("\n");

    return { context: contextFromDocuments, scoreInfo };
  }
}
