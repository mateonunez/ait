import { randomUUID } from "node:crypto";
import type { StreamEvent } from "@ait/core";
import type { RetrievedDocument as RagRetrievedDocument } from "../../rag/retrieve";
import { type EventData, METADATA_TYPE, STREAM_EVENT } from "../../types";
import type {
  DocumentSource,
  RAGContextMetadata as UIRAGContextMetadata,
  RetrievedDocument as UIRetrievedDocument,
} from "../../types/metadata/rag-context.metadata";

export interface ContextMetadataInput {
  context: string;
  documents: RagRetrievedDocument[];
  contextMetadata?: {
    usedTemporalCorrelation?: boolean;
  };
}

export interface ToolCallInput {
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults: Array<{ id: string; result?: unknown; error?: string }>;
}

export interface IMetadataEmitterService {
  createContextMetadataEvent(input: ContextMetadataInput, query: string): StreamEvent;
  createToolMetadataEvent(input: ToolCallInput): StreamEvent;
  createReasoningMetadataEvents<T>(steps: T[]): StreamEvent[];
  createTaskMetadataEvents<T>(tasks: T[]): StreamEvent[];
  createSuggestionMetadataEvent<T>(suggestions: T[]): StreamEvent;
  createModelMetadataEvent<T>(modelInfo: T): StreamEvent | null;
}

export class MetadataEmitterService implements IMetadataEmitterService {
  createContextMetadataEvent(input: ContextMetadataInput, query: string): StreamEvent {
    const documents = this._convertDocuments(input.documents);

    const payload: UIRAGContextMetadata = {
      documents,
      query,
      contextLength: input.context.length,
      documentCount: documents.length,
      fallbackUsed: false,
      timestamp: Date.now(),
      usedTemporalCorrelation: input.contextMetadata?.usedTemporalCorrelation ?? false,
    };

    return this._createMetadataEvent(METADATA_TYPE.CONTEXT, payload);
  }

  createToolMetadataEvent(input: ToolCallInput): StreamEvent {
    return this._createMetadataEvent(METADATA_TYPE.TOOL_CALL, {
      toolCalls: input.toolCalls,
      toolResults: input.toolResults,
    });
  }

  createReasoningMetadataEvents<T>(steps: T[]): StreamEvent[] {
    return steps.map((step) => this._createMetadataEvent(METADATA_TYPE.REASONING, step));
  }

  createTaskMetadataEvents<T>(tasks: T[]): StreamEvent[] {
    return tasks.map((task) => this._createMetadataEvent(METADATA_TYPE.TASK, task));
  }

  createSuggestionMetadataEvent<T>(suggestions: T[]): StreamEvent {
    return this._createMetadataEvent(METADATA_TYPE.SUGGESTION, suggestions);
  }

  createModelMetadataEvent<T>(modelInfo: T | null | undefined): StreamEvent | null {
    if (!modelInfo) return null;
    return this._createMetadataEvent(METADATA_TYPE.MODEL, modelInfo);
  }

  private _createMetadataEvent(type: EventData, data: unknown): StreamEvent {
    return {
      type: STREAM_EVENT.METADATA,
      data: { type, data },
    };
  }

  private _convertDocuments(documents: RagRetrievedDocument[]): UIRetrievedDocument[] {
    return documents.map((doc) => this._convertDocument(doc));
  }

  private _convertDocument(doc: RagRetrievedDocument): UIRetrievedDocument {
    const source: DocumentSource = {
      type: doc.collection,
      identifier: doc.id,
      url: doc.source,
      metadata: doc.metadata,
    };

    return {
      id: doc.id || randomUUID(),
      content: (doc.content || "").slice(0, 500),
      score: doc.score ?? 0,
      source,
      entityTypes: [doc.collection],
    };
  }
}
