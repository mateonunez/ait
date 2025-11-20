import { randomUUID } from "node:crypto";
import type { Document, BaseMetadata } from "../../types/documents";
import { buildTitleFromMetadata } from "../../types/context";
import { TextNormalizationService, type ITextNormalizationService } from "../metadata/text-normalization.service";
import { TemporalLabelService, type ITemporalLabelService } from "./temporal-label.service";
import type { EntityType } from "@ait/core";
import type { TemporalCluster } from "../filtering/temporal-correlation.service";
import type { EntityFormatter } from "./formatters/formatter.utils";
import { safeString } from "./formatters/formatter.utils";
import {
  SpotifyTrackFormatter,
  SpotifyArtistFormatter,
  SpotifyPlaylistFormatter,
  SpotifyAlbumFormatter,
  SpotifyRecentlyPlayedFormatter,
} from "./formatters/spotify.formatter";
import {
  GitHubRepositoryFormatter,
  GitHubPullRequestFormatter,
  GitHubCommitFormatter,
} from "./formatters/github.formatter";
import { XTweetFormatter } from "./formatters/x.formatter";
import { NotionPageFormatter } from "./formatters/notion.formatter";
import { SlackMessageFormatter } from "./formatters/slack.formatter";
import { LinearIssueFormatter } from "./formatters/linear.formatter";
import { formatMetadataToXml, formatDocumentToXml } from "../../utils/xml.utils";

const entityFormatters: Record<EntityType, EntityFormatter<unknown>> = {
  track: SpotifyTrackFormatter,
  artist: SpotifyArtistFormatter,
  playlist: SpotifyPlaylistFormatter,
  album: SpotifyAlbumFormatter,
  recently_played: SpotifyRecentlyPlayedFormatter,
  repository: GitHubRepositoryFormatter,
  pull_request: GitHubPullRequestFormatter,
  commit: GitHubCommitFormatter,
  tweet: XTweetFormatter,
  issue: LinearIssueFormatter,
  page: NotionPageFormatter,
  message: SlackMessageFormatter,
};

export class ContextBuilder {
  private readonly _textNormalizer: ITextNormalizationService;
  private readonly _temporalLabeler: ITemporalLabelService;

  constructor(textNormalizer?: ITextNormalizationService, temporalLabeler?: ITemporalLabelService) {
    this._textNormalizer = textNormalizer || new TextNormalizationService();
    this._temporalLabeler = temporalLabeler || new TemporalLabelService();
  }

  private buildNaturalContent(doc: Document<BaseMetadata>): string {
    const meta = doc.metadata;

    const originalText = safeString(meta.originalText);
    if (originalText && this._textNormalizer.isNaturalText(originalText)) {
      return originalText;
    }

    const entityType = meta.__type as EntityType | undefined;
    const formatter = entityType ? entityFormatters[entityType] : null;

    if (formatter) {
      return formatter.format(meta, doc.pageContent);
    }

    const cleaned = this._textNormalizer.cleanPageContent(doc.pageContent);
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
      const timeLabel = this._temporalLabeler.buildTimeLabel(cluster.centerTimestamp, cluster.timeWindow);
      const entityGroups = this._groupEntitiesByType(cluster.entities);
      const clusterContent: string[] = [];

      for (const [, entities] of Object.entries(entityGroups)) {
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

  private _buildEntityMap(documents: Document<BaseMetadata>[]): {
    entityMap: Map<string, string>;
    metadataMap: Map<string, BaseMetadata>;
  } {
    const entityMap = new Map<string, string>();
    const metadataMap = new Map<string, BaseMetadata>();

    for (const doc of documents) {
      const entityId = doc.metadata.id || randomUUID();
      const naturalContent = this.buildNaturalContent(doc);
      const existing = entityMap.get(entityId);

      if (existing && !existing.includes(naturalContent)) {
        entityMap.set(entityId, `${existing}\n${naturalContent}`);
      } else if (!existing) {
        entityMap.set(entityId, naturalContent);
      }

      metadataMap.set(entityId, doc.metadata);
    }

    return { entityMap, metadataMap };
  }

  private _formatEntities(entityMap: Map<string, string>, metadataMap: Map<string, BaseMetadata>): string {
    return Array.from(entityMap.entries())
      .map(([id, content]) => {
        const meta = metadataMap.get(id);
        if (!meta) return "";

        const header = buildTitleFromMetadata(meta);
        return `### ${header}\n${content}`;
      })
      .filter(Boolean)
      .join("\n\n");
  }

  public buildContextFromDocuments(documents: Document<BaseMetadata>[]): string {
    const { entityMap, metadataMap } = this._buildEntityMap(documents);
    return this._formatEntities(entityMap, metadataMap);
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

    const context = Array.from(entityMap.entries())
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

    return { context, scoreInfo };
  }

  /**
   * Build structured XML context with rich metadata
   */
  public buildStructuredContext(documents: Document<BaseMetadata>[]): string {
    const { entityMap, metadataMap } = this._buildEntityMap(documents);

    const xmlParts: string[] = [];

    for (const [id, content] of entityMap.entries()) {
      const meta = metadataMap.get(id);
      if (!meta) continue;

      const metadataXml = formatMetadataToXml(meta);
      const documentXml = formatDocumentToXml(id, (meta.__type as string) || "unknown", metadataXml, content);

      xmlParts.push(documentXml);
    }

    return xmlParts.join("\n\n");
  }
}
