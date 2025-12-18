import type { ChatMessage } from "./chat";
import type { BaseMetadata, Document } from "./documents";

/**
 * Configuration for conversation manager
 */
export interface ConversationConfig {
  /** Maximum number of recent messages to keep (default: 10) */
  maxRecentMessages?: number;
  /** Maximum tokens for conversation history (default: 2000) */
  maxHistoryTokens?: number;
  /** Enable conversation summarization (default: true) */
  enableSummarization?: boolean;
}

/**
 * Configuration for context preparation
 */
export interface ContextPreparationConfig {
  /** Enable RAG context retrieval (default: true) */
  enableRAG?: boolean;
  /** Cache duration in milliseconds (default: 5 minutes) */
  cacheDurationMs?: number;
  /** Minimum topic similarity to reuse cache (0-1, default: 0.7) */
  topicSimilarityThreshold?: number;
  /** Temporal correlation window in hours (default: 3) */
  temporalWindowHours?: number;
  /** Maximum context characters (default: 128000) */
  maxContextChars?: number;
}

/**
 * Configuration for tool execution
 */
export interface ToolExecutionConfig {
  /** Maximum tool execution rounds (default: 2) */
  maxRounds?: number;
  /** Timeout per tool in milliseconds (default: 30000) */
  toolTimeoutMs?: number;
}

/**
 * Configuration for retry operations
 */
export interface RetryConfig {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  delayMs?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffMultiplier?: number;
}

/**
 * Conversation context with history and summary
 */
export interface ConversationContext {
  /** Recent messages to include */
  recentMessages: ChatMessage[];
  /** Summarized older context (optional) */
  summary?: string;
  /** Total estimated tokens */
  estimatedTokens: number;
}

/**
 * RAG context with caching metadata
 */
export interface RAGContext {
  /** Retrieved context text */
  context: string;
  /** Documents used to build context */
  documents: Document<BaseMetadata>[];
  /** Timestamp when context was retrieved */
  timestamp: number;
  /** Query used to retrieve context */
  query: string;
  /** Whether a fallback context (no RAG) was returned */
  fallbackUsed?: boolean;
  /** Optional reason for fallback */
  fallbackReason?: string;
}

/**
 * Tool execution result with timing information
 */
export interface ToolExecutionResult {
  /** Tool name */
  name: string;
  /** Execution result */
  result: unknown;
  /** Error message if failed */
  error?: string;
  /** Execution time in milliseconds */
  executionTimeMs: number;
}

/**
 * Prompt components
 */
export interface PromptComponents {
  /** System message */
  systemMessage: string;
  /** Conversation history (optional) */
  conversationHistory?: string;
  /** Current user message */
  userMessage: string;
  /** Tool results (optional) */
  toolResults?: string;
  /** Query intent for style adaptation (optional) */
  intent?: {
    requiredStyle?: "concise" | "technical" | "creative" | "detailed";
    complexityScore?: number;
    primaryFocus?: string;
  };
}
