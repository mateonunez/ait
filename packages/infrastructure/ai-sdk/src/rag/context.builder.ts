import { randomUUID } from "node:crypto";
import type { Document, BaseMetadata } from "../types/documents";
import { buildTitleFromMetadata } from "../types/context";

export class ContextBuilder {
  public buildContextFromDocuments(documents: Document<BaseMetadata>[]): string {
    const entityMap = new Map<string, string>();
    const metadataMap = new Map<string, BaseMetadata>();

    for (const doc of documents) {
      const entityId = doc.metadata.id || randomUUID();
      entityMap.set(entityId, (entityMap.get(entityId) || "") + doc.pageContent);
      metadataMap.set(entityId, doc.metadata);
    }

    const contextFromDocuments = Array.from(entityMap.entries())
      .map(([id, content]) => {
        const meta = metadataMap.get(id);
        if (!meta) return "";

        const header = `## ${buildTitleFromMetadata(meta)}`;
        return `${header}\n${content}`;
      })
      .filter(Boolean)
      .join("\n\n");

    console.log("Context from documents", contextFromDocuments);

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
      const existing = entityMap.get(entityId);

      entityMap.set(entityId, {
        content: (existing?.content || "") + doc.pageContent,
        score: Math.max(existing?.score || 0, score),
      });

      metadataMap.set(entityId, doc.metadata);
    }

    const contextFromDocuments = Array.from(entityMap.entries())
      .map(([id, { content }]) => {
        const meta = metadataMap.get(id);
        if (!meta) return "";

        const header = `## ${buildTitleFromMetadata(meta)}`;
        return `${header}\n${content}`;
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
