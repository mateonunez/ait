import { getConversation, sendMessage } from "@/services/chat.service";
import { createEmptyMetadata } from "@/utils/stream-parser.utils";
import { calculateConversationTokens } from "@/utils/token-counter.utils";
import type { ChatMessageWithMetadata, MessageRole } from "@ait/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseAItChatOptions {
  initialMessages?: ChatMessageWithMetadata[];
  model?: string;
  enableMetadata?: boolean;
  conversationId?: string;
  onConversationCreated?: (conversationId: string) => void;
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
  tokenUsage: TokenUsage;
  conversationId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  loadConversation: (id: string) => Promise<void>;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
}

export function useAItChat(options: UseAItChatOptions = {}): UseAItChatReturn {
  const {
    initialMessages = [],
    model: initialModel = "gpt-oss:20b-cloud",
    enableMetadata = true,
    conversationId: initialConversationId,
    onConversationCreated,
    onError,
  } = options;

  const [messages, setMessages] = useState<ChatMessageWithMetadata[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [sessionId] = useState(() => `session-${Date.now()}`);

  const currentMessageIdRef = useRef<string | null>(null);
  const currentMessageContentRef = useRef<string>("");

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    setConversationId(null);
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      try {
        setError(null);
        setMessages([]); // Immediate clear for "ghost content"
        const data = await getConversation(id);

        const transformedMessages: ChatMessageWithMetadata[] = data.messages.map((message) => ({
          id: message.id,
          role: message.role as MessageRole,
          content: message.content,
          metadata: message.metadata as any,
          traceId: message.traceId || undefined,
          createdAt: new Date(message.createdAt),
        }));

        setMessages(transformedMessages);
        setConversationId(id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load conversation";
        setError(errorMessage);
        onError?.(errorMessage);
      }
    },
    [onError],
  );

  // Sync state with prop/route changes
  useEffect(() => {
    if (initialConversationId) {
      if (initialConversationId !== conversationId) {
        loadConversation(initialConversationId);
      }
    } else if (conversationId) {
      // If we had a conversation and now we don't (e.g. navigation to /chat), clear it
      clearMessages();
    }
  }, [initialConversationId, conversationId, loadConversation, clearMessages]);

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

      try {
        await sendMessage({
          messages: messages.concat(userMessage).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel,
          enableMetadata,
          sessionId,
          conversationId: conversationId || undefined,
          onText: (text) => {
            currentMessageContentRef.current += text;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessageId ? { ...m, content: currentMessageContentRef.current } : m)),
            );
          },
          onMetadata: (metadata) => {
            setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, metadata } : m)));
          },
          onComplete: (data) => {
            setMessages((prev) => prev.map((m) => (m.id === assistantMessageId ? { ...m, traceId: data.traceId } : m)));
            setIsLoading(false);
            // Store conversationId if returned
            if (data.conversationId && !conversationId) {
              setConversationId(data.conversationId);
              onConversationCreated?.(data.conversationId);
            }
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
    [messages, isLoading, selectedModel, enableMetadata, onError, sessionId, conversationId, onConversationCreated],
  );

  // Calculate token usage - RAG context from LATEST message only (what's actually sent to LLM)
  const tokenUsage = useMemo(() => {
    // Get RAG context length from the latest assistant message only
    // Previous messages' RAG context is NOT sent again - only the current turn's context matters
    const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    const ragContextLength = latestAssistant?.metadata?.context?.contextLength ?? 0;

    return calculateConversationTokens(
      messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      ragContextLength,
    );
  }, [messages]);

  return {
    messages,
    isLoading,
    error,
    tokenUsage,
    conversationId,
    sendMessage: handleSendMessage,
    clearMessages,
    loadConversation,
    selectedModel,
    setSelectedModel,
  };
}
