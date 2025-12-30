"use client";

import { cn } from "@/styles/utils";
import { MessageSquarePlus, PanelRight } from "lucide-react";
import { ModelSelector } from "../ai-elements";
import { ContextWindowTracker } from "../context-window-tracker";

export const ChatHeaderActions = ({
  selectedModel,
  setSelectedModel,
  tokenUsage,
  maxContextWindow,
  isLoading,
  messagesLength,
  handleNewChat,
  onToggleInspector,
}: {
  selectedModel: string;
  setSelectedModel: (id: string) => void;
  tokenUsage: any;
  maxContextWindow: number;
  isLoading: boolean;
  messagesLength: number;
  handleNewChat: () => void;
  onToggleInspector: () => void;
}) => {
  return (
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
          disabled={isLoading || messagesLength === 0}
          className={cn(
            "p-1.5 rounded-lg hover:bg-accent transition-colors",
            (isLoading || messagesLength === 0) && "opacity-50 cursor-not-allowed",
          )}
          title="New Chat"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleInspector}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          title="Toggle Inspector"
        >
          <PanelRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
