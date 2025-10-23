import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useChatDialog } from "@/contexts/chat.context";
import { ChatMessagesList } from "./chat-messages-list";
import { ArrowUp } from "lucide-react";
import { cn } from "@/styles/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export function ChatDialog() {
  const { isOpen, closeChat, openChat } = useChatDialog();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [textareaHeight, setTextareaHeight] = useState("auto");

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop } = useChat({
    api: "http://localhost:3000/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onResponse: (response) => {
      console.log("Response received:", response.status, response.headers.get("content-type"));
    },
    onFinish: (message) => {
      console.log("Message finished:", message);
    },
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          closeChat();
        } else {
          openChat();
        }
      }
      if (e.key === "Escape" && isOpen) {
        closeChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeChat, openChat]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: input is intentionally the only dependency for auto-resize
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollHeight = inputRef.current.scrollHeight;
      const newHeight = Math.min(scrollHeight, 200);
      inputRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(`${newHeight}px`);
    }
  }, [input]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(e);

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      setTextareaHeight("auto");
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      closeChat();
    }
  };

  const handleStop = () => {
    if (stop) {
      stop();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleInputChange({
      target: { value: suggestion },
    } as React.ChangeEvent<HTMLTextAreaElement>);

    setTimeout(() => {
      const syntheticEvent = {
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>;
      handleSubmit(syntheticEvent);
    }, 50);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent
        className={cn(
          "gap-0 p-0 !border-0 !outline-none shadow-2xl overflow-hidden flex flex-col",
          "h-[100dvh] max-h-[100dvh] min-h-[80dvh] w-screen max-w-screen",
          "sm:h-auto sm:max-h-[80dvh] sm:w-[min(90vw,1000px)] sm:rounded-3xl",
          "bg-background",
          "[&>button]:hidden",
        )}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between px-6 py-4 border-b border-border/40"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-rose-500 animate-ping opacity-75" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">AIt</h2>
              <p className="text-xs text-muted-foreground">
                {messages.length} {messages.length === 1 ? "message" : "messages"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Messages */}
        <ChatMessagesList messages={messages} isLoading={isLoading} onSuggestionClick={handleSuggestionClick} />

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3 bg-destructive/10 text-destructive text-sm border-t border-destructive/20"
            >
              <span className="font-medium">Error:</span> {error.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="border-t border-border/40 px-6 py-4 bg-background"
        >
          <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
            <div className="flex-1 relative flex items-center">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleFormSubmit(e as any);
                  }
                }}
                placeholder="Ask me anything..."
                style={{ height: textareaHeight, minHeight: "44px" }}
                className={cn(
                  "w-full resize-none rounded-2xl px-4 py-3",
                  "bg-muted/50 border border-border/50",
                  "focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30",
                  "placeholder:text-muted-foreground/50",
                  "text-sm leading-5",
                  "transition-all duration-200",
                )}
                rows={1}
                disabled={isLoading}
              />
            </div>

            {isLoading ? (
              <Button
                type="button"
                size="icon"
                onClick={handleStop}
                className="h-11 w-11 rounded-xl shrink-0 bg-foreground hover:bg-foreground/90"
              >
                <div className="h-3.5 w-3.5 bg-background rounded-sm" />
                <span className="sr-only">Stop</span>
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className={cn(
                  "h-11 w-11 rounded-xl shrink-0 transition-all duration-200",
                  "bg-foreground hover:bg-foreground/90 text-background",
                  "disabled:opacity-30 disabled:cursor-not-allowed",
                  input.trim() && "hover:scale-105",
                )}
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                <span className="sr-only">Send</span>
              </Button>
            )}
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
