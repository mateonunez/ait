import { formatFriendlyDate } from "@/utils/date.utils";
import type { Conversation } from "@ait/core";
import { MessageCircle, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

export interface ConversationsHistoryProps {
  currentConversationId: string | null;
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  onConversationSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onNewChat: () => void;
}

export function ConversationsHistory({
  currentConversationId,
  conversations,
  isLoading,
  error,
  onConversationSelect,
  onDelete,
  onNewChat,
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
    <div className="flex flex-col h-full">
      <div className="p-4">
        <Button onClick={onNewChat} variant="outline" className="w-full">
          <MessageCircle className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`w-full flex items-start justify-between p-3 rounded-lg text-left hover:bg-accent transition-colors group ${
                  conversation.id === currentConversationId ? "bg-accent" : ""
                }`}
                type="button"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium truncate">{conversation.title || "Untitled conversation"}</p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {formatFriendlyDate(conversation.updatedAt || conversation.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(conversation.id, e)}
                >
                  <Trash2 className="h-4 w-4 dark:text-white text-red-500" />
                </Button>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
