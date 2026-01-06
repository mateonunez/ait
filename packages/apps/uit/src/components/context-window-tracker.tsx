import type { TokenUsage } from "@/hooks/useAItChat";
import { cn } from "@/styles/utils";
import { calculateContextWindowUsage, formatTokenCount } from "@/utils/token-counter.utils";
import { motion } from "framer-motion";
import { AlertTriangle, Database, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface ContextWindowTrackerProps {
  tokenUsage: TokenUsage;
  maxContextWindow: number;
  className?: string;
  compact?: boolean;
}

export function ContextWindowTracker({
  tokenUsage,
  maxContextWindow,
  className,
  compact = false,
}: ContextWindowTrackerProps) {
  const usage = useMemo(
    () => calculateContextWindowUsage(tokenUsage.totalTokens, maxContextWindow),
    [tokenUsage.totalTokens, maxContextWindow],
  );

  const statusColors = {
    safe: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
    warning: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
    critical: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  };

  const StatusIcon = usage.status === "critical" ? AlertTriangle : usage.status === "warning" ? TrendingUp : Database;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs w-full", className)}>
        <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{formatTokenCount(tokenUsage.totalTokens)}</span>
          <span className="mx-1">/</span>
          <span>{formatTokenCount(maxContextWindow)}</span>
        </span>
        <div className="relative h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              usage.status === "critical"
                ? "bg-red-500"
                : usage.status === "warning"
                  ? "bg-yellow-500"
                  : "bg-green-500",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usage.percentage, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-3 w-full", statusColors[usage.status], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Context Window</span>
          </div>

          {/* Token breakdown */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <p className="text-[10px] uppercase opacity-70 mb-0.5">Input</p>
              <p className="font-mono font-medium">{formatTokenCount(tokenUsage.inputTokens)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-70 mb-0.5">Output</p>
              <p className="font-mono font-medium">{formatTokenCount(tokenUsage.outputTokens)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-70 mb-0.5">RAG</p>
              <p className="font-mono font-medium text-primary">{formatTokenCount(tokenUsage.ragContextTokens)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase opacity-70 mb-0.5">Total</p>
              <p className="font-mono font-medium">
                {formatTokenCount(tokenUsage.totalTokens)}/{formatTokenCount(maxContextWindow)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                usage.status === "critical"
                  ? "bg-red-600 dark:bg-red-500"
                  : usage.status === "warning"
                    ? "bg-yellow-600 dark:bg-yellow-500"
                    : "bg-green-600 dark:bg-green-500",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usage.percentage, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Status message */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="opacity-70">{usage.percentage.toFixed(1)}% used</span>
            <span className="opacity-70">{formatTokenCount(usage.remaining)} remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
}
