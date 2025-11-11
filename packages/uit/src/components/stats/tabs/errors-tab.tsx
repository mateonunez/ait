import { useStats } from "@/contexts/stats.context";
import { MetricCard } from "../metric-card";
import { AlertTriangle } from "lucide-react";

export function ErrorsTab() {
  const { errors } = useStats();

  if (!errors) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading error data...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error summary */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Error Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Total Errors"
            value={errors.summary.totalErrors}
            status={
              errors.summary.totalErrors === 0 ? "good" : errors.summary.totalErrors > 10 ? "critical" : "warning"
            }
            detail={errors.window}
          />
          <MetricCard
            label="Retry Success Rate"
            value={errors.summary.retrySuccessRate}
            status="neutral"
            detail="Resolved on retry"
          />
          <MetricCard
            label="Avg Retry Attempts"
            value={errors.summary.averageRetryAttempts}
            status="neutral"
            detail="Per error"
          />
        </div>
      </div>

      {/* Error spike alert */}
      {errors.summary.errorSpike && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div>
            <div className="text-xs font-medium text-yellow-600 mb-1">⚡ Error Spike Detected</div>
            <div className="text-[10px] text-muted-foreground">
              Error rate is significantly higher than usual. Check the error categories below.
            </div>
          </div>
        </div>
      )}

      {/* Errors by category */}
      {errors.byCategory.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Errors by Category
          </h3>
          <div className="space-y-2">
            {errors.byCategory.map((category, i) => (
              <div
                key={`error-category-${category.category}-${i}`}
                className="p-3 rounded border border-border/50 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{category.category}</span>
                    {category.isRetryable && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600">Retryable</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-foreground">{category.count}</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      category.percentage > 50
                        ? "bg-red-500"
                        : category.percentage > 20
                          ? "bg-yellow-500"
                          : "bg-blue-500",
                    )}
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{category.percentage.toFixed(1)}% of errors</span>
                  <span>{category.uniqueFingerprints} unique</span>
                </div>
                {category.suggestedAction && (
                  <div className="text-[10px] text-muted-foreground mt-1">→ {category.suggestedAction}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top errors */}
      {errors.topErrors.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Errors</h3>
          <div className="space-y-2">
            {errors.topErrors.slice(0, 5).map((error, i) => (
              <div
                key={`top-error-${error.fingerprint}-${i}`}
                className="p-3 rounded border border-border/50 bg-muted/30"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">
                      {error.severity}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {error.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-foreground">{error.count}x</span>
                </div>
                <div className="text-xs text-foreground mt-1 line-clamp-2">{error.message}</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  Fingerprint: <span className="font-mono">{error.fingerprint.slice(0, 16)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No errors state */}
      {errors.summary.totalErrors === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <div className="text-sm font-medium text-foreground">No Errors!</div>
          <div className="text-xs text-muted-foreground mt-1">All systems are running smoothly</div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
