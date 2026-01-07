"use client";

import { useIsMobile } from "@/hooks/use-mobile";

import type { ChatMessageWithMetadata, Conversation as ConversationType, TokenUsage } from "@ait/core";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Database, ListChecks, MessageCircle, Wrench, Zap } from "lucide-react";
import { useMemo } from "react";
import { ContextWindowTracker } from "../context-window-tracker";
import { ConversationsHistory } from "../conversations-history";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";

interface ChatSidebarPanelProps {
  currentConversationId: string | null;
  conversations: ConversationType[];
  isLoading: boolean;
  error: string | null;
  handleConversationSelect: (id: string) => void;
  handleDeleteConversation: (id: string) => Promise<void>;
  handleNewChat: () => void;
  tokenUsage: TokenUsage;
  maxContextWindow: number;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  latestAssistantMessage: ChatMessageWithMetadata | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const SidebarContent = ({
  currentConversationId,
  conversations,
  isLoading,
  error,
  handleConversationSelect,
  handleDeleteConversation,
  handleNewChat,
  tokenUsage,
  maxContextWindow,
  latestAssistantMessage,
}: Omit<ChatSidebarPanelProps, "isOpen" | "onClose">) => {
  // Compute active feature count for compact display
  const activeFeatures = [
    { icon: Database, label: "RAG", value: latestAssistantMessage?.metadata?.context?.documents?.length },
    { icon: Brain, label: "Thinking", value: latestAssistantMessage?.metadata?.reasoning?.length },
    { icon: ListChecks, label: "Tasks", value: latestAssistantMessage?.metadata?.tasks?.length },
    { icon: Wrench, label: "Tools", value: latestAssistantMessage?.metadata?.toolCalls?.length },
  ].filter((f) => f.value && f.value > 0);

  return (
    <>
      {/* New Chat Button */}
      <div className="shrink-0 p-2">
        <Button onClick={handleNewChat} variant="outline" className="w-full" size="sm">
          <MessageCircle className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <Separator />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ConversationsHistory
          currentConversationId={currentConversationId}
          conversations={conversations}
          isLoading={isLoading}
          error={error}
          onConversationSelect={handleConversationSelect}
          onDelete={handleDeleteConversation}
        />
      </div>

      <Separator />

      {/* Footer */}
      <div className="shrink-0 p-2.5 space-y-2 bg-muted/5">
        {/* Context Usage - compact mode */}
        <ContextWindowTracker tokenUsage={tokenUsage} maxContextWindow={maxContextWindow} compact />

        {/* Active Features - inline row if any active */}
        {activeFeatures.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Zap className="h-3 w-3 text-blue-500 shrink-0" />
            {activeFeatures.map(({ icon: Icon, label, value }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground"
              >
                <Icon className="h-3 w-3" />
                <span className="font-medium text-foreground">{value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export const ChatSidebarPanel = ({ isOpen = false, onClose, ...props }: ChatSidebarPanelProps) => {
  const isMobile = useIsMobile();
  const currentConversation = useMemo(() => {
    return props.conversations.find((c) => c.id === props.currentConversationId);
  }, [props.conversations, props.currentConversationId]);

  // Mobile: Use Sheet overlay
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetHeader className="p-3 shrink-0">
            <SheetTitle className="font-semibold text-foreground text-sm">
              {currentConversation?.title ?? "Sidebar"}
            </SheetTitle>
          </SheetHeader>
          <Separator />
          <SidebarContent {...props} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Inline aside with toggle animation
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="shrink-0 border-l border-border bg-sidebar flex flex-col h-full overflow-hidden"
        >
          <div className="p-3 shrink-0">
            <h3 className="font-semibold text-foreground text-sm truncate">
              {currentConversation?.title ?? "Sidebar"}
            </h3>
          </div>
          <Separator />
          <SidebarContent {...props} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
