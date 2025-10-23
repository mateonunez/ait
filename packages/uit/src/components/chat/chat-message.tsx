import { useState } from "react";
import { cn } from "@/styles/utils";
import type { Message } from "@ai-sdk/react";
import { Copy, Check } from "lucide-react";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("group flex gap-3 px-6 py-2", {
        "flex-row-reverse": isUser,
      })}
    >
      <div className="flex shrink-0 pt-0.5">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium",
            isUser ? "bg-foreground text-background" : "bg-muted text-muted-foreground ring-1 ring-border/50",
          )}
        >
          {isUser ? "You" : "AIt"}
        </div>
      </div>

      <div
        className={cn("flex flex-col gap-1 min-w-0 flex-1 max-w-[80%]", {
          "items-end": isUser,
        })}
      >
        <div
          className={cn("relative rounded-2xl px-3.5 py-2.5 transition-all", {
            "bg-foreground text-background": isUser,
            "bg-muted/50 text-foreground": !isUser,
          })}
        >
          {!isUser && !isStreaming && (
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                "absolute -top-2 -right-2 p-1.5 rounded-lg bg-background border border-border shadow-sm",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                "hover:bg-muted",
              )}
              title="Copy"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}

          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="streamdown-wrapper">
              <Streamdown className="prose prose-sm dark:prose-invert max-w-none">{message.content}</Streamdown>
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="inline-block w-0.5 h-4 ml-1 bg-foreground rounded-full align-middle"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
