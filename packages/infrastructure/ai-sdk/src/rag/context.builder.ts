import { randomUUID } from "node:crypto";
import type { Document, BaseMetadata } from "../types/documents";
import { buildTitleFromMetadata } from "../types/context";
import type {
  SpotifyTrackEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyAlbumEntity,
  GitHubRepositoryEntity,
  XTweetEntity,
  LinearIssueEntity,
} from "@ait/connectors";

type EntityType = "track" | "artist" | "playlist" | "album" | "repository" | "tweet" | "issue";

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

const buildGitHubRepository: EntityContentBuilder<GitHubRepositoryEntity> = (meta) => {
  const name = safeString(meta.name, "Unknown Repository");
  const description = safeString(meta.description);
  const language = safeString(meta.language);
  const stars = safeNumber(meta.stars);
  const forks = safeNumber(meta.forks);

  const stats: string[] = [];
  if (stars !== null) stats.push(`${stars} stars`);
  if (forks !== null) stats.push(`${forks} forks`);

  return joinParts(
    `Repository: "${name}"`,
    description ? ` - ${description}` : null,
    language ? ` (${language})` : null,
    stats.length > 0 ? `, ${stats.join(", ")}` : null,
  );
};

const buildXTweet: EntityContentBuilder<XTweetEntity> = (meta, pageContent) => {
  const text = safeString(meta.text || pageContent, "");
  const retweetCount = safeNumber(meta.retweetCount);
  const likeCount = safeNumber(meta.likeCount);
  const createdAt = formatDate(meta.createdAt);

  const engagement: string[] = [];
  if (retweetCount !== null && retweetCount > 0) engagement.push(`${retweetCount} retweets`);
  if (likeCount !== null && likeCount > 0) engagement.push(`${likeCount} likes`);

  return joinParts(
    `Tweet: ${text}`,
    engagement.length > 0 ? ` (${engagement.join(", ")})` : null,
    createdAt ? ` - ${createdAt}` : null,
  );
};

const buildLinearIssue: EntityContentBuilder<LinearIssueEntity> = (meta) => {
  const title = safeString(meta.title, "Unnamed Issue");
  const description = safeString(meta.description);
  const state = safeString(meta.state);
  const priority = safeNumber(meta.priority);
  const labels = safeArray<string>(meta.labels);
  const assigneeId = safeString(meta.assigneeId);

  const parts: string[] = [`Issue: "${title}"`];
  if (state) parts.push(` [${state}]`);
  if (priority !== null) parts.push(` (Priority: ${priority})`);
  if (assigneeId) parts.push(`, assigned to ${assigneeId}`);
  if (description) parts.push(`\n${truncate(description, 200)}`);
  if (labels.length > 0) parts.push(`\nLabels: ${labels.join(", ")}`);

  return parts.join("");
};

const entityBuilders: Record<EntityType, EntityContentBuilder<any>> = {
  track: buildSpotifyTrack,
  artist: buildSpotifyArtist,
  playlist: buildSpotifyPlaylist,
  album: buildSpotifyAlbum,
  repository: buildGitHubRepository,
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
