"use client";

import { useLayout } from "@/contexts/layout.context";
import { useAItChat } from "@/hooks/useAItChat";
import { useAiSuggestions } from "@/hooks/useAiSuggestions";
import { deleteConversation, listConversations } from "@/services/chat.service";
import { listModels } from "@/services/models.service";
import { cn } from "@/styles/utils";
import { type Conversation as ConversationType, type ModelMetadata, type SuggestionItem, getLogger } from "@ait/core";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Circle,
  Database,
  History,
  ListChecks,
  MessageSquarePlus,
  Settings,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Conversation, ModelSelector, PromptInput, Suggestions } from "../components/ai-elements";
import { ContextWindowTracker } from "../components/context-window-tracker";
import { ConversationsHistory } from "../components/conversations-history";
import { Badge } from "../components/ui/badge";

const logger = getLogger();

const DEFAULT_SUGGESTIONS: SuggestionItem[] = [
  { id: "1", type: "question", text: "What are you listening to right now?" },
  { id: "2", type: "question", text: "Show me my recent GitHub activity" },
  { id: "3", type: "question", text: "What did I tweet about today?" },
  { id: "4", type: "question", text: "Summarize my day based on my activity" },
];

type SidePanel = "settings" | null;

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
    currentMetadata,
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

  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [availableModels, setAvailableModels] = useState<ModelMetadata[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const { suggestions: dynamicSuggestions, isLoading: isSuggestionsLoading } = useAiSuggestions({
    enabled: messages.length === 0,
  });

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

  const suggestions = useMemo(() => {
    if (isLoading && currentMetadata?.suggestions) {
      return currentMetadata.suggestions;
    }
    return latestAssistantMessage?.metadata?.suggestions || [];
  }, [isLoading, currentMetadata, latestAssistantMessage]);

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
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden md:block shrink-0 min-w-0">
          <ModelSelector selectedModelId={selectedModel} onModelSelect={setSelectedModel} />
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <ContextWindowTracker tokenUsage={tokenUsage} maxContextWindow={maxContextWindow} compact />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleNewChat}
            disabled={isLoading || messages.length === 0}
            className={cn(
              "p-1.5 rounded-lg hover:bg-accent transition-colors",
              (isLoading || messages.length === 0) && "opacity-50 cursor-not-allowed",
            )}
            title="New Chat"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              const next = sidePanel === "settings" ? null : "settings";
              setSidePanel(next);
              if (next) setIsSidebarOpen(false);
            }}
            className={cn(
              "p-1.5 rounded-lg hover:bg-accent transition-colors",
              sidePanel === "settings" && "bg-accent text-primary",
            )}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !isSidebarOpen;
              setIsSidebarOpen(next);
              if (next) setSidePanel(null);
            }}
            className={cn(
              "p-1.5 rounded-lg hover:bg-accent transition-colors",
              isSidebarOpen && "bg-accent text-primary",
            )}
            title={isSidebarOpen ? "Hide history" : "Show history"}
          >
            <History className="h-4 w-4" />
          </button>
        </div>
      </div>,
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
    sidePanel,
    isSidebarOpen,
    setHeaderActions,
    setHeaderTitle,
    handleNewChat,
    setSelectedModel,
  ]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex-1 flex min-h-0 relative">
          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 py-8 sm:py-12 space-y-4 sm:space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Start a conversation</h2>
                    <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                      Ask me anything and I'll help you with context-aware responses powered by RAG and tool calling.
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
                <Conversation
                  messages={messages}
                  streamingMessageId={streamingMessageId}
                  layoutTrigger={showSuggestions}
                />
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

          {/* Settings Sidebar */}
          <AnimatePresence>
            {sidePanel === "settings" && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 sm:hidden"
                  onClick={() => setSidePanel(null)}
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed sm:relative inset-y-0 right-0 z-50 sm:z-auto w-full sm:w-80 md:w-96 border-l bg-background shadow-xl sm:shadow-none"
                >
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                      <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">Chat Settings</h3>
                      <button
                        type="button"
                        onClick={() => setSidePanel(null)}
                        className="p-1 hover:bg-accent rounded-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      <ContextWindowTracker tokenUsage={tokenUsage} maxContextWindow={maxContextWindow} />

                      <div className="space-y-4">
                        <section>
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Model Config</h4>
                          <ModelSelector
                            selectedModelId={selectedModel}
                            onModelSelect={setSelectedModel}
                            className="w-full"
                          />
                        </section>

                        <section className="rounded-xl border p-4 bg-muted/30">
                          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                            <Zap className="h-4 w-4 text-blue-500" /> Active Features
                          </h4>
                          <div className="space-y-3">
                            <FeatureItem
                              icon={Database}
                              label="RAG Context"
                              value={latestAssistantMessage?.metadata?.context?.documents?.length}
                              unit="docs"
                            />
                            <FeatureItem
                              icon={Brain}
                              label="Thinking"
                              value={latestAssistantMessage?.metadata?.reasoning?.length}
                              unit="steps"
                            />
                            <FeatureItem
                              icon={ListChecks}
                              label="Task List"
                              value={latestAssistantMessage?.metadata?.tasks?.length}
                              unit="tasks"
                            />
                            <FeatureItem
                              icon={Wrench}
                              label="Tools"
                              value={latestAssistantMessage?.metadata?.toolCalls?.length}
                              unit="tools"
                            />
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* History Sidebar */}
          <AnimatePresence>
            {isSidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto w-full sm:w-80 border-l bg-background shadow-xl lg:shadow-none"
                >
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b lg:hidden">
                      <h3 className="font-semibold text-foreground">Recent History</h3>
                      <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        className="p-1 hover:bg-accent rounded-md"
                      >
                        <X className="h-4 w-4 text-foreground" />
                      </button>
                    </div>
                    <ConversationsHistory
                      currentConversationId={currentConversationId}
                      conversations={conversations}
                      isLoading={isHistoryLoading}
                      error={historyError}
                      onConversationSelect={handleConversationSelect}
                      onDelete={handleDeleteConversation}
                      onNewChat={handleNewChat}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon: Icon,
  label,
  value,
  unit,
}: { icon: LucideIcon; label: string; value?: number; unit: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value ? (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {value} {unit}
          </Badge>
        ) : (
          <Circle className="h-2 w-2 text-muted-foreground/20 fill-current" />
        )}
      </div>
    </div>
  );
}
