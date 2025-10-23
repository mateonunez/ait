import { Search } from "lucide-react";
import { cn } from "@/styles/utils";
import { useChatDialog } from "@/contexts/chat.context";

export function ChatInput() {
  const { openChat } = useChatDialog();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 mt-8">
      <button
        type="button"
        onClick={openChat}
        className={cn(
          "w-full flex items-center gap-3 px-6 py-4 rounded-full",
          "bg-background/50 backdrop-blur-sm",
          "border-2 border-border",
          "shadow-lg hover:shadow-xl",
          "transition-all duration-300",
          "hover:scale-[1.02] active:scale-[0.98]",
          "group cursor-pointer",
        )}
        aria-label="Open chat"
      >
        <Search className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        <span className="text-muted-foreground group-hover:text-foreground transition-colors text-left flex-1">
          Ask AIt anything...
        </span>
        <kbd
          className={cn(
            "hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border px-2 text-xs font-medium",
            "bg-muted text-muted-foreground",
          )}
        >
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
    </div>
  );
}
