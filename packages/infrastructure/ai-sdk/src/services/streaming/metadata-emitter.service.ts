import { randomUUID } from "node:crypto";
import type { Document, BaseMetadata } from "../../types/documents";
import type { RetrievedDocument } from "../../types/metadata/rag-context.metadata";
import type { StreamEvent } from "../../types";
import { STREAM_EVENT, METADATA_TYPE } from "../../types";

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
    return (rawDocuments as Document<BaseMetadata>[]).map((doc) => {
      const entityType = doc.metadata.__type || "unknown";
      const score = typeof doc.metadata.score === "number" ? doc.metadata.score : 0;

      const timestamp =
        doc.metadata.createdAt ||
        doc.metadata.playedAt ||
        doc.metadata.mergedAt ||
        doc.metadata.pushedAt ||
        doc.metadata.publishedAt ||
        undefined;

      let content = doc.pageContent;
      if (doc.metadata.title && typeof doc.metadata.title === "string") {
        content = doc.metadata.title;
        if (doc.metadata.description && typeof doc.metadata.description === "string") {
          content += ` - ${doc.metadata.description}`;
        }
      } else if (doc.metadata.name && typeof doc.metadata.name === "string") {
        content = doc.metadata.name;
        if (doc.metadata.artist && typeof doc.metadata.artist === "string") {
          content += ` by ${doc.metadata.artist}`;
        }
      }

      const source: { type: string; identifier?: string; url?: string; metadata?: Record<string, unknown> } = {
        type: entityType,
        identifier: doc.metadata.id as string | undefined,
        url: doc.metadata.url as string | undefined,
        metadata: {
          collectionVendor: doc.metadata.collectionVendor,
          repositoryName: doc.metadata.repositoryName,
          repositoryFullName: doc.metadata.repositoryFullName,
        },
      };

      return {
        id: (doc.metadata.id as string) || randomUUID(),
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
