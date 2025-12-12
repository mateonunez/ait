import type { ChatMessageWithMetadata } from "@ait/core";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Message } from "./message";

interface ConversationProps {
  messages: ChatMessageWithMetadata[];
  streamingMessageId?: string;
  className?: string;
  layoutTrigger?: boolean;
}

export function Conversation({ messages, streamingMessageId, className, layoutTrigger }: ConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: We want to trigger on explicit signals
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content, layoutTrigger]);

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
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
