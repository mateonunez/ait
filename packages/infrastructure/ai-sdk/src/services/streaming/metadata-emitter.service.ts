import { randomUUID } from "node:crypto";
import type { RetrievedDocument as RagRetrievedDocument } from "../../rag/retrieve";
import type { StreamEvent } from "../../types";
import { METADATA_TYPE, STREAM_EVENT } from "../../types";
import type { BaseMetadata, Document } from "../../types/documents";
import type { RetrievedDocument } from "../../types/metadata/rag-context.metadata";

export interface RAGContextMetadata {
  context: string;
  documents: unknown[];
  rerankedDocuments?: unknown[];
  fusedDocuments?: unknown[];
  contextMetadata?: {
    documentCount: number;
    contextLength: number;
    usedTemporalCorrelation: boolean;
  };
}

export interface ToolCallMetadata {
  toolCalls: unknown[];
  toolResults: unknown[];
  hasToolCalls: boolean;
}

export class MetadataEmitterService {
  convertDocumentsToUIFormat(rawDocuments: unknown[]): RetrievedDocument[] {
    return rawDocuments.map((rawDoc) => {
      // Handle RagRetrievedDocument (from retrieve.ts) - the primary source
      const ragDoc = rawDoc as RagRetrievedDocument;
      if (ragDoc.content !== undefined && ragDoc.score !== undefined && ragDoc.collection !== undefined) {
        return {
          id: ragDoc.id || randomUUID(),
          content: (ragDoc.content || "").slice(0, 500),
          score: ragDoc.score || 0,
          source: {
            type: ragDoc.collection,
            identifier: ragDoc.id,
            url: ragDoc.source,
            metadata: ragDoc.metadata,
          },
          timestamp: undefined,
          entityTypes: [ragDoc.collection],
        };
      }

      // Handle Document<BaseMetadata> type (legacy)
      const legacyDoc = rawDoc as unknown as Document<BaseMetadata>;
      const metadata = legacyDoc.metadata || ({} as BaseMetadata);
      const entityType = metadata.__type || "unknown";
      const score = typeof metadata.score === "number" ? metadata.score : 0;

      const timestamp =
        metadata.createdAt ||
        metadata.playedAt ||
        metadata.mergedAt ||
        metadata.pushedAt ||
        metadata.publishedAt ||
        undefined;

      let content = legacyDoc.pageContent || "";
      if (metadata.title && typeof metadata.title === "string") {
        content = metadata.title;
        if (metadata.description && typeof metadata.description === "string") {
          content += ` - ${metadata.description}`;
        }
      } else if (metadata.name && typeof metadata.name === "string") {
        content = metadata.name;
        if (metadata.artist && typeof metadata.artist === "string") {
          content += ` by ${metadata.artist}`;
        }
      }

      const source: { type: string; identifier?: string; url?: string; metadata?: Record<string, unknown> } = {
        type: entityType,
        identifier: metadata.id as string | undefined,
        url: metadata.url as string | undefined,
        metadata: {
          collectionVendor: metadata.collectionVendor,
          repositoryName: metadata.repositoryName,
          repositoryFullName: metadata.repositoryFullName,
        },
      };

      return {
        id: (metadata.id as string) || randomUUID(),
        content: content.slice(0, 500),
        score,
        source,
        timestamp: timestamp ? new Date(timestamp as string | number | Date).getTime() : undefined,
        entityTypes: [entityType],
      };
    });
  }

  createContextMetadataEvent(ragMetadata: RAGContextMetadata, query: string): StreamEvent {
    const rawDocuments = ragMetadata.rerankedDocuments || ragMetadata.fusedDocuments || ragMetadata.documents || [];
    const documentsToSend = this.convertDocumentsToUIFormat(rawDocuments);

    return {
      type: STREAM_EVENT.METADATA,
      data: {
        type: METADATA_TYPE.CONTEXT,
        data: {
          documents: documentsToSend as never,
          query,
          contextLength: ragMetadata.context?.length || 0,
          documentCount: documentsToSend.length,
          usedTemporalCorrelation: ragMetadata.contextMetadata?.usedTemporalCorrelation || false,
        } as never,
      },
    };
  }

  createToolMetadataEvent(toolMetadata: ToolCallMetadata): StreamEvent {
    return {
      type: STREAM_EVENT.METADATA,
      data: {
        type: METADATA_TYPE.TOOL_CALL,
        data: {
          toolCalls: toolMetadata.toolCalls,
          toolResults: toolMetadata.toolResults,
        } as never,
      },
    };
  }

  createReasoningMetadataEvent(reasoning: unknown[]): StreamEvent[] {
    if (!reasoning || reasoning.length === 0) {
      return [];
    }
    return reasoning.map((step) => ({
      type: STREAM_EVENT.METADATA,
      data: {
        type: METADATA_TYPE.REASONING,
        data: step as never,
      },
    }));
  }

  createTaskMetadataEvent(tasks: unknown[]): StreamEvent[] {
    if (!tasks || tasks.length === 0) {
      return [];
    }
    return tasks.map((task) => ({
      type: STREAM_EVENT.METADATA,
      data: {
        type: METADATA_TYPE.TASK,
        data: task as never,
      },
    }));
  }

  createSuggestionMetadataEvent(suggestions: unknown[]): StreamEvent {
    return {
      type: STREAM_EVENT.METADATA,
      data: {
        type: METADATA_TYPE.SUGGESTION,
        data: (suggestions || []) as never,
      },
    };
  }

  createModelMetadataEvent(modelInfo: unknown): StreamEvent | null {
    if (!modelInfo) {
      return null;
    }
    return {
      type: STREAM_EVENT.METADATA,
      data: {
        type: METADATA_TYPE.MODEL,
        data: modelInfo as never,
      },
    };
  }
}
