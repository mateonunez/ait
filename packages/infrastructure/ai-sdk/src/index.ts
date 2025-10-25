export * from "./client/ai-sdk.client";

export * from "./config/models.config";

export * from "./services/embeddings/embeddings.service";
export * from "./services/embeddings/embeddings.config";
export * from "./services/embeddings/text-preprocessor";
export * from "./services/text-generation/text-generation.service";
export * from "./services/text-generation/retry.service";
export * from "./services/text-generation/tool-execution.service";
export * from "./services/text-generation/prompt-builder.service";
export * from "./services/text-generation/context-preparation.service";
export * from "./services/text-generation/conversation-manager.service";
export * from "./services/text-generation/utils/stream.utils";
export * from "./services/prompts/system.prompt";

// RAG Services
export * from "./services/rag/query-planner.service";
export * from "./services/rag/diversity.service";
export * from "./services/rag/type-filter.service";
export * from "./services/rag/rank-fusion.service";
export * from "./services/rag/multi-query-retrieval.service";
export { createMultiQueryRetrievalService } from "./services/rag/multi-query-retrieval.factory";

export * from "./rag/qdrant.provider";
export { ContextBuilder } from "./rag/context.builder";

export * from "./tools/connectors.tools";
export { convertToOllamaTools } from "./tools/tool.converter";
export type { OllamaTool, OllamaToolCall } from "./client/ollama.provider";

export * from "./cache/lru-cache";

export * from "./types";
export type { ChatMessage, MessageRole } from "./types/chat";
export { formatConversationHistory } from "./types/chat";
