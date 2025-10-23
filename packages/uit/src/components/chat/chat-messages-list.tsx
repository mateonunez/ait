import { useEffect, useRef, useCallback } from "react";
import type { Message } from "@ai-sdk/react";
import { ChatMessage } from "./chat-message";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/styles/utils";

interface ChatMessagesListProps {
  messages: Message[];
  isLoading: boolean;
  onSuggestionClick?: (suggestion: string) => void;
}

export function ChatMessagesList({ messages, isLoading, onSuggestionClick }: ChatMessagesListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<Message | null>(null);

  const lastMessage = messages[messages.length - 1];
  const isStreaming = lastMessage && lastMessage.role === "assistant" && isLoading;
  const showThinking = isLoading && (!lastMessage || lastMessage.role === "user");

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: needed for scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom, messages.length, isLoading]);

  useEffect(() => {
    if (lastMessage) {
      lastMessageRef.current = lastMessage;
    }
  }, [lastMessage]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-[300px] max-h-[60dvh]">
      <AnimatePresence mode="wait">
        {messages.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-[300px] px-6 py-6"
          >
            <div className="text-center space-y-4 max-w-md">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 ring-1 ring-border/50"
              >
                <Sparkles className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground tracking-tight">How can I help you?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ask about my work, projects, music, or recent activity
                </p>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                {["What music do I listen to?", "Tell me about my GitHub projects", "What are my recent tweets?"].map(
                  (suggestion, i) => (
                    <motion.button
                      key={suggestion}
                      type="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                      onClick={() => onSuggestionClick?.(suggestion)}
                      className={cn(
                        "px-3.5 py-2 rounded-xl text-sm text-left",
                        "bg-muted/50 hover:bg-muted",
                        "border border-border/50 hover:border-border",
                        "transition-all duration-200",
                        "text-foreground/80 hover:text-foreground",
                      )}
                    >
                      {suggestion}
                    </motion.button>
                  ),
                )}
              </div>

              <p className="text-xs text-muted-foreground/60 mt-4">Powered by mateonunez</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-3"
          >
            {messages.map((message, index) => {
              const isLastMessage = index === messages.length - 1;
              const isStreamingThis = isLastMessage && message.role === "assistant" && isStreaming;

              return <ChatMessage key={message.id} message={message} isStreaming={isStreamingThis} />;
            })}

            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-3 px-6 py-2"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-border/50 text-[10px] font-medium pt-0.5">
                    AIt
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      className="flex gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                        style={{ animationDelay: "0.2s" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                        style={{ animationDelay: "0.4s" }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
