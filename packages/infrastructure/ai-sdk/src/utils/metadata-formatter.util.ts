import type { RAGContextMetadata, RetrievedDocument, ToolCallMetadata } from "../types";

/**
 * Format RAG context for display
 */
export function formatRagContext(context: RAGContextMetadata): string {
  if (context.fallbackUsed) {
    return `Fallback context used: ${context.fallbackReason || "Unknown reason"}`;
  }

  const parts: string[] = [
    `Retrieved ${context.documents.length} documents`,
    `Context length: ${context.contextLength} chars`,
  ];

  if (context.retrievalTimeMs) {
    parts.push(`Retrieved in ${context.retrievalTimeMs}ms`);
  }

  if (context.usedTemporalCorrelation) {
    parts.push("Used temporal correlation");
  }

  return parts.join(" | ");
}

/**
 * Format retrieved document for preview
 */
export function formatDocument(doc: RetrievedDocument, maxLength = 200): string {
  const content = doc.content.length > maxLength ? `${doc.content.slice(0, maxLength)}...` : doc.content;

  const source = formatDocumentSource(doc.source);
  const score = (doc.score * 100).toFixed(1);

  return `[${source}] (${score}% relevance)\n${content}`;
}

/**
 * Format document source
 */
export function formatDocumentSource(source: { type: string; identifier?: string; url?: string }): string {
  if (source.identifier) {
    return `${source.type}:${source.identifier}`;
  }
  return source.type;
}

/**
 * Format tool call for display
 */
export function formatToolCall(toolCall: ToolCallMetadata): string {
  const args = Object.keys(toolCall.arguments)
    .map((key) => `${key}=${JSON.stringify(toolCall.arguments[key])}`)
    .join(", ");

  const parts = [`${toolCall.name}(${args})`];

  if (toolCall.status === "completed" && toolCall.durationMs) {
    parts.push(`✓ ${toolCall.durationMs}ms`);
  } else if (toolCall.status === "failed") {
    parts.push(`✗ ${toolCall.error}`);
  } else if (toolCall.status === "executing") {
    parts.push("⏳");
  }

  return parts.join(" ");
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

/**
 * Format timestamp as relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    // < 1 minute
    return "just now";
  }
  if (diff < 3600000) {
    // < 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }
  if (diff < 86400000) {
    // < 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / 86400000);
  return `${days}d ago`;
}
