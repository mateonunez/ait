"use client";

import { ChatSidebarPanel } from "@/components/chat/chat-sidebar-panel";
import { useLayout } from "@/contexts/layout.context";
import { useAItChat } from "@/hooks/useAItChat";
import { useAiSuggestions } from "@/hooks/useAiSuggestions";
import { deleteConversation, listConversations } from "@/services/chat.service";
import { listModels } from "@/services/models.service";
import { type Conversation as ConversationType, type ModelMetadata, type SuggestionItem, getLogger } from "@ait/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Conversation, PromptInput, Suggestions } from "../components/ai-elements";
import { ChatHeaderActions } from "../components/chat/chat-header-actions";

const logger = getLogger();

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  { id: "1", type: "question", text: "What are you listening to right now?" },
  { id: "2", type: "question", text: "Show me my recent GitHub activity" },
  { id: "3", type: "question", text: "What did I tweet about today?" },
  { id: "4", type: "question", text: "Summarize my day based on my activity" },
];

export default function ChatPage() {
  const [, params] = useRoute("/chat/:conversationId");
  const [, setLocation] = useLocation();
  const conversationId = params?.conversationId;

  const [conversations, setConversations] = useState<ConversationType[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { setHeaderActions, setHeaderTitle } = useLayout();

  const loadHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const data = await listConversations();
      setConversations(data);
      setHistoryError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load history";
      logger.error("[ChatPage] Error loading history:", { error: message });
      setHistoryError(message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const {
    messages,
    isLoading,
    tokenUsage,
    sendMessage,
    clearMessages,
    selectedModel,
    setSelectedModel,
    conversationId: currentConversationId,
  } = useAItChat({
    enableMetadata: true,
    conversationId: conversationId || undefined,
    onConversationCreated: (id: string) => {
      setLocation(`/chat/${id}`);
      loadHistory();
    },
  });

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === currentConversationId) {
        handleNewChat();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete conversation";
      logger.error("[ChatPage] Error deleting conversation:", { error: message });
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [availableModels, setAvailableModels] = useState<ModelMetadata[]>([]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    listModels()
      .then((models: ModelMetadata[]) => {
        setAvailableModels(models);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to fetch models";
        logger.error("[ChatPage] Failed to fetch models:", { error: message });
      });
  }, []);

  const currentModelInfo = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [availableModels, selectedModel],
  );

  const maxContextWindow = currentModelInfo?.contextWindow || 128000;
  const streamingMessageId = isLoading ? messages[messages.length - 1]?.id : undefined;

  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const recentMessages = useMemo(() => {
    return messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
  }, [messages]);

  const { suggestions: dynamicSuggestions, isLoading: isSuggestionsLoading } = useAiSuggestions({
    enabled: messages.length === 0 || (!isLoading && latestAssistantMessage != null),
    context: latestAssistantMessage?.content?.slice(0, 300),
    recentMessages,
    debounceMs: 500,
  });

  const suggestions = useMemo(() => {
    if (isLoading) return [];
    if (dynamicSuggestions.length > 0) return dynamicSuggestions;
    return latestAssistantMessage?.metadata?.suggestions || [];
  }, [isLoading, dynamicSuggestions, latestAssistantMessage]);

  const hasSuggestions = suggestions.length > 0;

  const handleSuggestionClick = (suggestion: SuggestionItem) => {
    sendMessage(suggestion.text);
  };

  const showSuggestions = hasSuggestions && !isLoading && messages.length > 0;

  const handleNewChat = useCallback(() => {
    clearMessages();
    setLocation("/chat");
  }, [clearMessages, setLocation]);

  const handleConversationSelect = (id: string) => {
    setLocation(`/chat/${id}`);
  };

  // Sync header actions and title with Unified Topbar
  useEffect(() => {
    setHeaderTitle("AIt Chat");
    setHeaderActions(
      <ChatHeaderActions
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        tokenUsage={tokenUsage}
        maxContextWindow={maxContextWindow}
        isLoading={isLoading}
        messagesLength={messages.length}
        handleNewChat={handleNewChat}
        onToggleInspector={() => setIsSidebarOpen((prev) => !prev)}
      />,
    );

    return () => {
      setHeaderActions(null);
      setHeaderTitle(null);
    };
  }, [
    selectedModel,
    tokenUsage,
    maxContextWindow,
    isLoading,
    messages.length,
    setHeaderActions,
    setHeaderTitle,
    handleNewChat,
    setSelectedModel,
  ]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 py-8 sm:py-12 space-y-4 sm:space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground text-center">
                  Your Data. Your AI. <span className="text-gradient">One Platform.</span>
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto text-center">
                  Ask about your code, music, or tasks. I'll help you with context-aware responses powered by RAG and
                  tool calling.
                </p>
              </div>
              <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
                <p className="text-xs text-muted-foreground mb-3 text-center">Try asking:</p>
                <Suggestions
                  variant="simple"
                  suggestions={dynamicSuggestions.length > 0 ? dynamicSuggestions : DEFAULT_SUGGESTIONS}
                  onSuggestionClick={handleSuggestionClick}
                  isLoading={isSuggestionsLoading}
                />
              </div>
            </div>
          ) : (
            <Conversation messages={messages} streamingMessageId={streamingMessageId} />
          )}
        </div>

        {showSuggestions && (
          <div className="px-3 sm:px-6 py-3 border-t border-border bg-background/50 backdrop-blur-sm">
            <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
          </div>
        )}

        {/* User Input */}
        <div className="px-3 sm:px-6 py-4 border-t border-border bg-background">
          <div className="max-w-4xl mx-auto">
            <PromptInput onSubmit={sendMessage} disabled={isLoading} focusOnEnable={true} />
          </div>
        </div>
      </div>

      <ChatSidebarPanel
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentConversationId={currentConversationId}
        conversations={conversations}
        isLoading={isHistoryLoading}
        error={historyError}
        handleConversationSelect={handleConversationSelect}
        handleDeleteConversation={handleDeleteConversation}
        handleNewChat={handleNewChat}
        tokenUsage={tokenUsage}
        maxContextWindow={maxContextWindow}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        latestAssistantMessage={latestAssistantMessage}
      />
    </div>
  );
}
