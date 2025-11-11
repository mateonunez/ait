export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function calculateConversationTokens(
  messages: Array<{ role: string; content: string }>,
  ragContextLength?: number,
): {
  inputTokens: number;
  outputTokens: number;
  ragContextTokens: number;
  totalTokens: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;

  for (const message of messages) {
    const tokens = estimateTokens(message.content);
    if (message.role === "user" || message.role === "system") {
      inputTokens += tokens;
    } else if (message.role === "assistant") {
      outputTokens += tokens;
    }
  }

  // RAG context is injected as part of the system message, so it's input tokens
  // contextLength is already in characters, so convert directly to tokens
  const ragContextTokens = ragContextLength ? Math.ceil(ragContextLength / 4) : 0;

  return {
    inputTokens,
    outputTokens,
    ragContextTokens,
    totalTokens: inputTokens + outputTokens + ragContextTokens,
  };
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

export function calculateContextWindowUsage(
  usedTokens: number,
  maxTokens: number,
): {
  percentage: number;
  remaining: number;
  status: "safe" | "warning" | "critical";
} {
  const percentage = (usedTokens / maxTokens) * 100;
  const remaining = maxTokens - usedTokens;

  let status: "safe" | "warning" | "critical" = "safe";
  if (percentage >= 90) {
    status = "critical";
  } else if (percentage >= 70) {
    status = "warning";
  }

  return {
    percentage,
    remaining,
    status,
  };
}
