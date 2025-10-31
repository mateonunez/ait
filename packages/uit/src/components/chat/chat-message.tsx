import { useState } from "react";
import { cn } from "@/styles/utils";
import type { Message } from "@ai-sdk/react";
import { Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";
import { submitFeedback, type FeedbackRating } from "@/utils/feedback.utils";

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  traceId?: string;
}

export function ChatMessage({ message, isStreaming = false, traceId }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackRating | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (rating: FeedbackRating) => {
    if (feedbackSubmitting || feedback) return; // Prevent multiple submissions

    setFeedbackSubmitting(true);
    try {
      const result = await submitFeedback({
        messageId: message.id,
        traceId,
        rating,
      });

      if (result.success) {
        setFeedback(rating);
        console.log("[ChatMessage] Feedback submitted:", rating);
      } else {
        console.error("[ChatMessage] Failed to submit feedback:", result.error);
      }
    } catch (error) {
      console.error("[ChatMessage] Error submitting feedback:", error);
    } finally {
      setFeedbackSubmitting(false);
    }
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
            <div className="absolute -top-2 -right-2 flex gap-1">
              {/* Thumbs Down Button */}
              <button
                type="button"
                onClick={() => handleFeedback("thumbs_down")}
                disabled={!!feedback}
                className={cn(
                  "p-1.5 rounded-lg bg-background border border-border shadow-sm",
                  "opacity-0 group-hover:opacity-100 transition-all duration-200",
                  "hover:bg-muted disabled:cursor-not-allowed",
                  feedback === "thumbs_down" &&
                    "opacity-100 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
                )}
                title="Thumbs down"
              >
                <ThumbsDown
                  className={cn(
                    "h-3 w-3",
                    feedback === "thumbs_down"
                      ? "text-red-600 dark:text-red-400 fill-current"
                      : "text-muted-foreground",
                  )}
                />
              </button>

              {/* Thumbs Up Button */}
              <button
                type="button"
                onClick={() => handleFeedback("thumbs_up")}
                disabled={!!feedback}
                className={cn(
                  "p-1.5 rounded-lg bg-background border border-border shadow-sm",
                  "opacity-0 group-hover:opacity-100 transition-all duration-200",
                  "hover:bg-muted disabled:cursor-not-allowed",
                  feedback === "thumbs_up" &&
                    "opacity-100 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                )}
                title="Thumbs up"
              >
                <ThumbsUp
                  className={cn(
                    "h-3 w-3",
                    feedback === "thumbs_up"
                      ? "text-green-600 dark:text-green-400 fill-current"
                      : "text-muted-foreground",
                  )}
                />
              </button>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "p-1.5 rounded-lg bg-background border border-border shadow-sm",
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
            </div>
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
