"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import type { Conversation as ConversationType } from "@ait/core";
import { Brain, Database, ListChecks, Wrench, Zap } from "lucide-react";
import { useMemo } from "react";
import { ModelSelector } from "../ai-elements";
import { ContextWindowTracker } from "../context-window-tracker";
import { ConversationsHistory } from "../conversations-history";
import { Separator } from "../ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { FeatureItem } from "./feature-item";

interface ChatSidebarPanelProps {
  currentConversationId: string | null;
  conversations: ConversationType[];
  isLoading: boolean;
  error: string | null;
  handleConversationSelect: (id: string) => void;
  handleDeleteConversation: (id: string) => Promise<void>;
  handleNewChat: () => void;
  tokenUsage: any;
  maxContextWindow: number;
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  latestAssistantMessage: any;
  isOpen?: boolean;
  onClose?: () => void;
}

const SectionLabel = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <p className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
    {icon}
    {children}
  </p>
);

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
  selectedModel,
  setSelectedModel,
  latestAssistantMessage,
}: Omit<ChatSidebarPanelProps, "isOpen" | "onClose">) => (
  <>
    {/* Scrollable Content */}
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <ConversationsHistory
        currentConversationId={currentConversationId}
        conversations={conversations}
        isLoading={isLoading}
        error={error}
        onConversationSelect={handleConversationSelect}
        onDelete={handleDeleteConversation}
        onNewChat={handleNewChat}
      />
    </div>

    <Separator />

    {/* Footer */}
    <div className="shrink-0 bg-muted/5 space-y-3 p-3">
      {/* Model Config */}
      <div>
        <SectionLabel>Model Config</SectionLabel>
        <ModelSelector selectedModelId={selectedModel} onModelSelect={setSelectedModel} className="w-full" />
      </div>

      <Separator />

      {/* Context Usage */}
      <div>
        <SectionLabel>Context Usage</SectionLabel>
        <ContextWindowTracker tokenUsage={tokenUsage} maxContextWindow={maxContextWindow} />
      </div>

      <Separator />

      {/* Active Features */}
      <div>
        <SectionLabel icon={<Zap className="h-3 w-3 text-blue-500" />}>Active Features</SectionLabel>
        <div className="space-y-1.5">
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
      </div>
    </div>
  </>
);

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

  // Desktop: Inline aside
  return (
    <aside className="w-80 shrink-0 border-l border-border bg-sidebar flex flex-col h-full overflow-hidden">
      <div className="p-3 shrink-0">
        <h3 className="font-semibold text-foreground text-sm">{currentConversation?.title ?? "Sidebar"}</h3>
      </div>
      <Separator />
      <SidebarContent {...props} />
    </aside>
  );
};
