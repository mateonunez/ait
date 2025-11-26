import { useState, useMemo, useEffect } from "react";
import {
  X,
  Settings,
  Activity,
  BarChart3,
  Database,
  Brain,
  ListChecks,
  Wrench,
  CheckCircle2,
  Circle,
  MessageSquarePlus,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Conversation, PromptInput, ModelSelector, Suggestions } from "./ai-elements";
import { ContextWindowTracker } from "./context-window-tracker";
import { useAItChat } from "@/hooks/useAItChat";
import { cn } from "@/styles/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { listModels } from "@/utils/api";
import { Link } from "wouter";

interface AIChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SidePanel = "settings" | null;

export function AIChatDialog({ open, onOpenChange }: AIChatDialogProps) {
  const {
    messages,
    isLoading,
    currentMetadata,
    tokenUsage,
    sendMessage,
    clearMessages,
    selectedModel,
    setSelectedModel,
  } = useAItChat({
    enableMetadata: true,
  });

  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [_modelsLoading, setModelsLoading] = useState(true);

  useEffect(() => {
    setModelsLoading(true);
    listModels()
      .then((models) => {
        setAvailableModels(models);
        setModelsLoading(false);
      })
      .catch((error) => {
        console.error("[AIChatDialog] Failed to fetch models:", error);
        setModelsLoading(false);
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

  // Get suggestions from the latest assistant message or current metadata during streaming
  const suggestions = useMemo(() => {
    if (isLoading && currentMetadata?.suggestions) {
      return currentMetadata.suggestions;
    }
    return latestAssistantMessage?.metadata?.suggestions || [];
  }, [isLoading, currentMetadata, latestAssistantMessage]);

  const hasSuggestions = suggestions.length > 0;

  const handleSuggestionClick = (suggestion: any) => {
    // If suggestion has an action, handle it
    if (suggestion.action?.type === "prompt") {
      sendMessage(suggestion.text);
    } else {
      // Default: use suggestion text as prompt
      sendMessage(suggestion.text);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 h-[100dvh] max-h-[100dvh] w-screen !max-w-none p-0 gap-0 flex flex-col [&>button]:hidden !rounded-none !border-0">
        <DialogTitle className="sr-only">AIt Chat</DialogTitle>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-border">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold whitespace-nowrap flex-shrink-0">AIt Chat</h2>
            <div className="hidden md:block flex-shrink-0 min-w-0">
              <ModelSelector selectedModelId={selectedModel} onModelSelect={setSelectedModel} />
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <ContextWindowTracker tokenUsage={tokenUsage} maxContextWindow={maxContextWindow} compact />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!isLoading && messages.length > 0) {
                  clearMessages();
                }
              }}
              disabled={isLoading || messages.length === 0}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors",
                (isLoading || messages.length === 0) && "opacity-50 cursor-not-allowed",
              )}
              title="New Chat"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setSidePanel(sidePanel === "settings" ? null : "settings")}
              className={cn(
                "p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors",
                sidePanel === "settings" && "bg-muted",
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-muted transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Chat area */}
          <div className={cn("flex-1 flex flex-col min-w-0 transition-all duration-200", sidePanel === "settings")}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-4 sm:px-6 py-8 sm:py-12 space-y-4 sm:space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-semibold">Start a conversation</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Ask me anything and I'll help you with context-aware responses
                      <br className="hidden sm:block" />
                      <span className="sm:hidden"> </span>
                      powered by RAG and tool calling.
                    </p>
                  </div>
                  <div className="w-full max-w-2xl mx-auto px-4 sm:px-0">
                    <p className="text-xs text-muted-foreground mb-3 text-center">Try asking:</p>
                    <Suggestions
                      variant="simple"
                      suggestions={[
                        { id: "1", type: "question", text: "What are you listening to right now?" },
                        { id: "2", type: "question", text: "Show me my recent GitHub activity" },
                        { id: "3", type: "question", text: "What did I tweet about today?" },
                        { id: "4", type: "question", text: "Summarize my day based on my activity" },
                      ]}
                      onSuggestionClick={handleSuggestionClick}
                    />
                  </div>
                </div>
              ) : (
                <Conversation messages={messages} streamingMessageId={streamingMessageId} />
              )}
            </div>

            {/* Dynamic Suggestions (after messages) */}
            {hasSuggestions && !isLoading && messages.length > 0 && (
              <div className="px-3 sm:px-4 md:px-6 py-3 border-t border-border">
                <Suggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
              </div>
            )}

            {/* Input */}
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-border">
              <PromptInput onSubmit={sendMessage} disabled={isLoading} />
            </div>
          </div>

          {/* Side panel - Overlay on mobile, slide-in on desktop */}
          <AnimatePresence>
            {sidePanel === "settings" && (
              <>
                {/* Mobile overlay backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 sm:hidden"
                  onClick={() => setSidePanel(null)}
                />

                {/* Side panel */}
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className={cn(
                    "fixed sm:relative inset-y-0 right-0 z-50 sm:z-auto",
                    "w-full sm:w-[320px] md:w-[400px]",
                    "border-l border-border bg-background",
                    "overflow-hidden shadow-xl sm:shadow-none",
                  )}
                >
                  <div className="h-full flex flex-col">
                    {/* Mobile header with close button */}
                    <div className="flex items-center justify-between p-3 sm:hidden border-b border-border flex-shrink-0">
                      <h3 className="text-base font-semibold">Settings</h3>
                      <button
                        type="button"
                        onClick={() => setSidePanel(null)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Close settings"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 sm:space-y-4">
                      {/* Always show context window tracker in side panel */}
                      <ContextWindowTracker tokenUsage={tokenUsage} maxContextWindow={maxContextWindow} />

                      {/* Settings content */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium mb-3">Model Selection</h3>
                          <ModelSelector
                            selectedModelId={selectedModel}
                            onModelSelect={setSelectedModel}
                            className="w-full"
                          />
                        </div>

                        <div className="rounded-lg border border-border p-4">
                          <h3 className="text-sm font-medium mb-3">Features</h3>
                          <div className="space-y-2.5">
                            {/* RAG Context */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">RAG Context</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {latestAssistantMessage?.metadata?.context ? (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {latestAssistantMessage.metadata.context.documents?.length || 0} docs
                                    </Badge>
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </>
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/30" />
                                )}
                              </div>
                            </div>

                            {/* Chain of Thought */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Brain className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Chain of Thought</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {latestAssistantMessage?.metadata?.reasoning &&
                                latestAssistantMessage.metadata.reasoning.length > 0 ? (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {latestAssistantMessage.metadata.reasoning.length} steps
                                    </Badge>
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </>
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/30" />
                                )}
                              </div>
                            </div>

                            {/* Task Breakdown */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <ListChecks className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Task Breakdown</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {latestAssistantMessage?.metadata?.tasks &&
                                latestAssistantMessage.metadata.tasks.length > 0 ? (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {latestAssistantMessage.metadata.tasks.length} tasks
                                    </Badge>
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </>
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/30" />
                                )}
                              </div>
                            </div>

                            {/* Tool Calls */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Tool Calls</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {latestAssistantMessage?.metadata?.toolCalls &&
                                latestAssistantMessage.metadata.toolCalls.length > 0 ? (
                                  <>
                                    <Badge variant="secondary" className="text-xs">
                                      {latestAssistantMessage.metadata.toolCalls.length} tools
                                    </Badge>
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  </>
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground/30" />
                                )}
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground pt-2 border-t">
                              Features are auto-detected per message
                            </p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border p-4">
                          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            System Metrics
                          </h3>
                          <p className="text-xs text-muted-foreground mb-3">
                            Monitor performance, health, and quality metrics in real-time.
                          </p>
                          <Link href="/stats">
                            <Button variant="outline" className="w-full" size="sm">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Open Metrics Dashboard
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
