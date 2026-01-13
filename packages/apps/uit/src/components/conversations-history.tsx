import { formatFriendlyDate } from "@ait/core";
import type { Conversation } from "@ait/core";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

export interface ConversationsHistoryProps {
  currentConversationId: string | null;
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  onConversationSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

export function ConversationsHistory({
  currentConversationId,
  conversations,
  isLoading,
  error,
  onConversationSelect,
  onDelete,
}: ConversationsHistoryProps) {
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 gap-2">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-x-hidden">
      <p className="text-[10px] font-medium text-muted-foreground uppercase px-2 py-1.5">Recent Conversations</p>
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-1 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-xs text-muted-foreground">No conversations yet</p>
              <p className="text-[10px] text-muted-foreground mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`w-full flex items-center justify-between p-1.5 rounded-md text-left hover:bg-accent transition-colors group ${
                  conversation.id === currentConversationId ? "bg-accent" : ""
                }`}
                type="button"
              >
                <div className="flex-1 min-w-0 pr-1">
                  <p className="text-xs font-medium truncate">{conversation.title || "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {formatFriendlyDate(conversation.updatedAt || conversation.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(conversation.id, e)}
                >
                  <Trash2 className="h-2.5 w-2.5 dark:text-white text-destructive" />
                </Button>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
