import type { ChatMessageWithMetadata } from "@ait/core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Message } from "./message";

interface ConversationProps {
  messages: ChatMessageWithMetadata[];
  streamingMessageId?: string;
  className?: string;
}

export function Conversation({ messages, streamingMessageId, className }: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const lastUserMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") return messages[i]?.id;
    }
    return undefined;
  }, [messages]);

  const lastScrolledUserMessageIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const shouldScroll = lastUserMessageId !== undefined && lastUserMessageId !== lastScrolledUserMessageIdRef.current;

    if (shouldScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      lastScrolledUserMessageIdRef.current = lastUserMessageId;
    }
  }, [lastUserMessageId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-run when messages change to recalculate scroll position
  useEffect(() => {
    const scrollParent = document.querySelector<HTMLElement>(".custom-scrollbar");
    scrollParentRef.current = scrollParent;

    if (!scrollParent) {
      // Fallback: not at bottom if we can't find scroll container
      setIsAtBottom(false);
      return;
    }

    const updateIsAtBottom = () => {
      const el = scrollParentRef.current;
      if (!el) {
        setIsAtBottom(false);
        return;
      }
      const thresholdPx = 100;
      const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      setIsAtBottom(distanceFromBottom <= thresholdPx);
    };

    updateIsAtBottom();
    scrollParent.addEventListener("scroll", updateIsAtBottom, { passive: true });
    window.addEventListener("resize", updateIsAtBottom);

    return () => {
      scrollParent.removeEventListener("scroll", updateIsAtBottom);
      window.removeEventListener("resize", updateIsAtBottom);
    };
  }, [messages.length]);

  const showScrollToBottom = messages.length > 0 && !isAtBottom;

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="max-w-md space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h3 className="text-lg font-semibold text-foreground">Start a conversation</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Ask me anything and I'll help you with context-aware responses powered by RAG and tool calling.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {messages.map((message) => (
          <Message key={message.id} message={message} isStreaming={message.id === streamingMessageId} />
        ))}
        <div ref={bottomRef} className="h-px w-full" />
      </div>

      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="sticky bottom-5 flex justify-center pointer-events-none z-10 -mt-4"
          >
            <button
              type="button"
              onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
              aria-label="Scroll to bottom"
              className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm hover:bg-accent transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Bottom
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
