import { useState, useCallback, useRef, useMemo } from "react";
import { sendMessage } from "@/utils/api";
import type { ChatMessageWithMetadata, AggregatedMetadata } from "../types/streaming.types";
import { createEmptyMetadata } from "@/utils/stream-parser.utils";
import { calculateConversationTokens } from "@/utils/token-counter.utils";

export interface UseAItChatOptions {
  initialMessages?: ChatMessageWithMetadata[];
  model?: string;
  enableMetadata?: boolean;
  onError?: (error: string) => void;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  ragContextTokens: number;
  totalTokens: number;
}

export interface UseAItChatReturn {
  messages: ChatMessageWithMetadata[];
  isLoading: boolean;
  error: string | null;
  currentMetadata: AggregatedMetadata | null;
  tokenUsage: TokenUsage;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
}

export function useAItChat(options: UseAItChatOptions = {}): UseAItChatReturn {
  const { initialMessages = [], model: initialModel = "gpt-oss:20b-cloud", enableMetadata = true, onError } = options;

  const [messages, setMessages] = useState<ChatMessageWithMetadata[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMetadata, setCurrentMetadata] = useState<AggregatedMetadata | null>(null);
  const [selectedModel, setSelectedModel] = useState(initialModel);

  const currentMessageIdRef = useRef<string | null>(null);
  const currentMessageContentRef = useRef<string>("");

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);
      setIsLoading(true);

      // Add user message
      const userMessage: ChatMessageWithMetadata = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      currentMessageIdRef.current = assistantMessageId;
      currentMessageContentRef.current = "";

      const assistantMessage: ChatMessageWithMetadata = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        metadata: createEmptyMetadata(),
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentMetadata(createEmptyMetadata());

      try {
        await sendMessage({
          messages: messages.concat(userMessage).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          enableMetadata,
          onText: (text) => {
            currentMessageContentRef.current += text;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessageId ? { ...m, content: currentMessageContentRef.current } : m)),
            );
          },
          onMetadata: (metadata) => {
            setCurrentMetadata(metadata);
            setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, metadata } : m)));
          },
          onComplete: (data) => {
            setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, traceId: data.traceId } : m)));
            setCurrentMetadata(null);
            setIsLoading(false);
          },
          onError: (errorMessage) => {
            setError(errorMessage);
            setIsLoading(false);
            onError?.(errorMessage);
            // Remove the assistant message on error
            setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
        // Remove the assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
      }
    },
    [messages, isLoading, selectedModel, enableMetadata, onError],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setCurrentMetadata(null);
  }, []);

  // Calculate cumulative token usage across conversation INCLUDING RAG context
  const tokenUsage = useMemo(() => {
    // Get cumulative RAG context length from all messages
    let totalRagContextLength = 0;
    for (const message of messages) {
      if (message.metadata?.context?.contextLength) {
        totalRagContextLength += message.metadata.context.contextLength;
      }
    }

    return calculateConversationTokens(
      messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      totalRagContextLength,
    );
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    currentMetadata,
    tokenUsage,
    sendMessage: handleSendMessage,
    clearMessages,
    selectedModel,
    setSelectedModel,
  };
}
