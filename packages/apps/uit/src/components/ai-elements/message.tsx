import { type FeedbackRating, submitFeedback } from "@/services/feedback.service";
import { cn } from "@/styles/utils";
import type { ChatMessageWithMetadata } from "@ait/core";
import { getLogger } from "@ait/core";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Copy, Database, ListChecks, ThumbsDown, ThumbsUp, Wrench } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { Badge } from "../ui/badge";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";

const logger = getLogger();

interface MessageProps {
  message: ChatMessageWithMetadata;
  isStreaming?: boolean;
}

export function Message({ message, isStreaming = false }: MessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackRating | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = async (rating: FeedbackRating) => {
    if (feedbackSubmitting || feedback) return;

    setFeedbackSubmitting(true);
    try {
      const result = await submitFeedback({
        messageId: message.id,
        traceId: message.traceId,
        rating,
      });

      if (result.success) {
        setFeedback(rating);
      }
    } catch (error) {
      logger.error("[Message] Error submitting feedback:", { error });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const hasReasoning = message.metadata?.reasoning && message.metadata?.reasoning.length > 0;
  const hasContext = message.metadata?.context && message.metadata?.context.documents.length > 0;
  const hasToolCalls = message.metadata?.toolCalls && message.metadata?.toolCalls.length > 0;
  const hasTasks = message.metadata?.tasks && message.metadata?.tasks.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn("group flex gap-2.5 px-4 py-2.5", {
        "flex-row-reverse": isUser,
      })}
    >
      <div className="flex shrink-0 pt-0.5">
        <div
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium",
            isUser ? "bg-foreground text-background" : "bg-muted text-muted-foreground ring-1 ring-border/50",
          )}
        >
          {isUser ? "You" : "AI"}
        </div>
      </div>

      <div
        className={cn("flex flex-col gap-1.5 min-w-0 flex-1 max-w-[90%]", {
          "items-end": isUser,
        })}
      >
        {/* Reasoning panel */}
        {hasReasoning && (
          <Reasoning isStreaming={isStreaming}>
            <ReasoningTrigger />
            <ReasoningContent>
              {message.metadata?.reasoning?.map((r: any) => r.content).join("\n\n") || ""}
            </ReasoningContent>
          </Reasoning>
        )}

        {/* Main message content */}
        {(isUser || message.content) && (
          <div
            className={cn("relative rounded-xl px-3 py-2 transition-all", {
              "bg-foreground text-background": isUser,
              "bg-muted/50 text-foreground": !isUser,
            })}
          >
            {/* Action buttons for assistant messages */}
            {!isUser && !isStreaming && message.content && (
              <div className="absolute -top-2 -right-2 flex gap-1">
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

            {/* Message content */}
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="streamdown-wrapper">
                <Streamdown
                  className="prose prose-sm dark:prose-invert max-w-none"
                  shikiTheme={["github-light", "github-dark"]}
                >
                  {message.content}
                </Streamdown>
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
        )}

        {/* Metadata badges */}
        {!isUser && !isStreaming && (hasContext || hasToolCalls || hasTasks) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {hasContext && message.metadata?.context && (
              <button
                type="button"
                onClick={() => setShowContext(!showContext)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-background border border-border hover:bg-muted transition-colors"
              >
                <Database className="h-3 w-3" />
                <span>Context ({message.metadata.context.documents.length})</span>
                {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {hasTasks && message.metadata?.tasks && (
              <button
                type="button"
                onClick={() => setShowTasks(!showTasks)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-background border border-border hover:bg-muted transition-colors"
              >
                <ListChecks className="h-3 w-3" />
                <span>Tasks ({message.metadata.tasks.length})</span>
                {showTasks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
            {hasToolCalls && message.metadata?.toolCalls && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <Wrench className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">
                  {message.metadata.toolCalls.length} tool{message.metadata.toolCalls.length > 1 ? "s" : ""} called
                </span>
              </div>
            )}
          </div>
        )}

        {/* Context panel */}
        <AnimatePresence>
          {showContext && hasContext && message.metadata?.context && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full rounded-lg bg-background border border-border p-2.5 space-y-1.5 max-h-[400px] overflow-y-auto"
            >
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Retrieved Context (sorted by relevance)
              </div>
              {message.metadata.context.documents
                .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                .slice(0, 10)
                .map((doc: any, idx: number) => {
                  const score = typeof doc.score === "number" ? doc.score : 0;
                  const relevancePercent = (Math.min(Math.max(score, 0), 1) * 100).toFixed(0);

                  return (
                    <div key={doc.id || idx} className="p-2 rounded bg-muted/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {doc.source?.type || "document"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{relevancePercent}% relevant</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{doc.content}</p>
                      {doc.source?.identifier && (
                        <p className="text-xs text-primary/70 truncate">{doc.source.identifier}</p>
                      )}
                    </div>
                  );
                })}
              {message.metadata?.context && message.metadata.context.documents.length > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-2 border-t">
                  +{message.metadata.context.documents.length - 10} more documents
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tasks panel */}
        <AnimatePresence>
          {showTasks && hasTasks && message.metadata?.tasks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full rounded-lg bg-background border border-border p-2.5 space-y-1.5"
            >
              <div className="text-xs font-medium text-muted-foreground mb-2">Task Breakdown</div>
              {message.metadata.tasks.map((task: any) => (
                <div key={task.id} className="p-2 rounded bg-muted/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant={task.status === "completed" ? "default" : "outline"} className="text-xs">
                      {task.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{task.title || task.description}</p>
                  {task.description && task.title && (
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
