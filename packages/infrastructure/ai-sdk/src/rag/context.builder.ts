import type { Document as QdrantDocument } from "./qdrant.provider";
import { randomUUID } from "node:crypto";

export interface Document extends QdrantDocument {
  pageContent: string;
  metadata: {
    id: string;
    __type: string;
    [key: string]: unknown;
  };
}

export class ContextBuilder {
  public buildContextFromDocuments(documents: Document[]): string {
    const entityMap = new Map<string, string>();
    const metadataMap = new Map<string, Record<string, unknown>>();

    for (const doc of documents) {
      const entityId = (doc.metadata?.id as string) || randomUUID();
      entityMap.set(entityId, (entityMap.get(entityId) || "") + doc.pageContent);
      metadataMap.set(entityId, (doc.metadata || {}) as Record<string, unknown>);
    }

    const buildTitle = (meta: Record<string, unknown>): string => {
      const type = (meta.__type as string) || "Document";
      const name = typeof (meta as { name?: unknown }).name === "string" ? (meta as { name?: string }).name : undefined;
      const artist =
        typeof (meta as { artist?: unknown }).artist === "string" ? (meta as { artist?: string }).artist : undefined;
      const title = name && artist ? `${name} — ${artist}` : name;
      const fallback =
        title ||
        (typeof (meta as { title?: unknown }).title === "string" ? (meta as { title?: string }).title : undefined) ||
        (typeof (meta as { description?: unknown }).description === "string"
          ? (meta as { description?: string }).description
          : undefined) ||
        type;
      return `${type} ${fallback}`.trim();
    };

    const contextFromDocuments = Array.from(entityMap.entries())
      .map(([id, content]) => {
        const meta = metadataMap.get(id) || {};
        const header = `## ${buildTitle(meta)}`;
        return `${header}\n${content}`;
      })
      .join("\n\n");

    console.log("Context from documents", contextFromDocuments);

    return contextFromDocuments;
  }

  public buildContextWithScores(documents: Array<{ doc: Document; score: number }>): {
    context: string;
    scoreInfo: string;
  } {
    const entityMap = new Map<string, { content: string; score: number }>();
    const metadataMap = new Map<string, Record<string, unknown>>();

    for (const { doc, score } of documents) {
      const entityId = (doc.metadata?.id as string) || randomUUID();
      const existing = entityMap.get(entityId);

      entityMap.set(entityId, {
        content: (existing?.content || "") + doc.pageContent,
        score: Math.max(existing?.score || 0, score),
      });

      metadataMap.set(entityId, (doc.metadata || {}) as Record<string, unknown>);
    }

    const buildTitle = (meta: Record<string, unknown>): string => {
      const type = (meta.__type as string) || "Document";
      const name = typeof (meta as { name?: unknown }).name === "string" ? (meta as { name?: string }).name : undefined;
      const artist =
        typeof (meta as { artist?: unknown }).artist === "string" ? (meta as { artist?: string }).artist : undefined;
      const title = name && artist ? `${name} — ${artist}` : name;
      const fallback =
        title ||
        (typeof (meta as { title?: unknown }).title === "string" ? (meta as { title?: string }).title : undefined) ||
        (typeof (meta as { description?: unknown }).description === "string"
          ? (meta as { description?: string }).description
          : undefined) ||
        type;
      return `${type} ${fallback}`.trim();
    };

    const contextFromDocuments = Array.from(entityMap.entries())
      .map(([id, { content }]) => {
        const meta = metadataMap.get(id) || {};
        const header = `## ${buildTitle(meta)}`;
        return `${header}\n${content}`;
      })
      .join("\n\n");

    const scoreInfo = Array.from(entityMap.entries())
      .map(([id, { score }]) => {
        const meta = metadataMap.get(id) || {};
        return `${buildTitle(meta)}: ${score.toFixed(4)}`;
      })
      .join("\n");

    return { context: contextFromDocuments, scoreInfo };
  }
}
