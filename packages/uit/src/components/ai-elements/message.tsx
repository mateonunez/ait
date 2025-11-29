import { useState } from "react";
import { cn } from "@/styles/utils";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Brain,
  Database,
  Wrench,
  ListChecks,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";
import { submitFeedback, type FeedbackRating } from "@/utils/feedback.utils";
import type { ChatMessageWithMetadata } from "@ait/core";
import { Badge } from "../ui/badge";
import { getLogger } from "@ait/core";

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
  const [showReasoning, setShowReasoning] = useState(false);
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
      className={cn("group flex gap-3 px-6 py-4", {
        "flex-row-reverse": isUser,
      })}
    >
      <div className="flex shrink-0 pt-0.5">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
            isUser ? "bg-foreground text-background" : "bg-muted text-muted-foreground ring-1 ring-border/50",
          )}
        >
          {isUser ? "You" : "AI"}
        </div>
      </div>

      <div
        className={cn("flex flex-col gap-2 min-w-0 flex-1 max-w-[85%]", {
          "items-end": isUser,
        })}
      >
        {/* Main message content */}
        <div
          className={cn("relative rounded-2xl px-4 py-3 transition-all", {
            "bg-foreground text-background": isUser,
            "bg-muted/50 text-foreground": !isUser,
          })}
        >
          {/* Action buttons for assistant messages */}
          {!isUser && !isStreaming && (
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

        {/* Metadata badges */}
        {!isUser && !isStreaming && (hasReasoning || hasContext || hasToolCalls || hasTasks) && (
          <div className="flex flex-wrap gap-2">
            {hasReasoning && message.metadata?.reasoning && (
              <button
                type="button"
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-background border border-border hover:bg-muted transition-colors"
              >
                <Brain className="h-3 w-3" />
                <span>Reasoning ({message.metadata.reasoning.length})</span>
                {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
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

        {/* Reasoning panel */}
        <AnimatePresence>
          {showReasoning && hasReasoning && message.metadata?.reasoning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full rounded-lg bg-background border border-border p-3 space-y-2"
            >
              <div className="text-xs font-medium text-muted-foreground mb-2">Chain of Thought</div>
              {message.metadata.reasoning.map((step, index) => (
                <div key={step.id} className="flex gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 text-sm">
                    <Badge variant="outline" className="mb-1 text-xs">
                      {step.type}
                    </Badge>
                    <p className="text-muted-foreground">{step.content}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context panel */}
        <AnimatePresence>
          {showContext && hasContext && message.metadata?.context && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full rounded-lg bg-background border border-border p-3 space-y-2 max-h-[400px] overflow-y-auto"
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
              className="w-full rounded-lg bg-background border border-border p-3 space-y-2"
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
