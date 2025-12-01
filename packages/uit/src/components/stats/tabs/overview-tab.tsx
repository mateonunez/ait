import { useStats } from "@/contexts/stats.context";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { MetricCard } from "../metric-card";

export function OverviewTab() {
  const { health, performance, cache, cost, quality, system, isLoading } = useStats();

  // Show loading state
  if (isLoading && !health && !performance && !cost && !system) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading overview...</div>
    );
  }

  // Show error state if critical data is missing after loading
  if (!isLoading && (!health || !performance || !cost || !system)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <div className="text-sm font-medium text-muted-foreground">Failed to load some metrics</div>
        <div className="text-xs text-muted-foreground">
          Missing:{" "}
          {[!health && "Health", !performance && "Performance", !cost && "Cost", !system && "System"]
            .filter(Boolean)
            .join(", ")}
        </div>
      </div>
    );
  }

  // At this point, we have all required data
  if (!health || !performance || !cost || !system) {
    return null;
  }

  const getHealthStatus = (): "good" | "warning" | "critical" => {
    if (health.health.healthy) return "good";
    if (health.health.issues.length > 2) return "critical";
    return "warning";
  };

  const getLatencyStatus = (latencyMs: number): "good" | "warning" | "critical" => {
    if (latencyMs < 2000) return "good";
    if (latencyMs < 5000) return "warning";
    return "critical";
  };

  const getErrorRateStatus = (rate: number): "good" | "warning" | "critical" => {
    if (rate < 1) return "good";
    if (rate < 5) return "warning";
    return "critical";
  };

  const getCacheStatus = (rate: number): "good" | "warning" | "critical" => {
    if (rate > 60) return "good";
    if (rate > 30) return "warning";
    return "critical";
  };

  const getQualityStatus = (score: number): "good" | "warning" | "critical" => {
    if (score >= 75) return "good";
    if (score >= 40) return "warning";
    return "critical";
  };

  return (
    <div className="space-y-6">
      {/* Key metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Health Status"
          value={health.health.healthy ? "Healthy" : "Degraded"}
          status={getHealthStatus()}
          detail={health.health.issues.length > 0 ? `${health.health.issues.length} issues` : "All systems operational"}
        />

        <MetricCard
          label="Uptime"
          value={system.process.uptime}
          status="neutral"
          detail={`PID: ${system.process.pid}`}
        />

        <MetricCard
          label="Total Requests"
          value={performance.errorRate.totalRequests.toLocaleString()}
          status="neutral"
          detail={`${performance.throughput.requestsPerMinute.toFixed(0)} req/min`}
        />
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="P95 Latency"
          value={performance.latency.seconds.p95}
          suffix="s"
          status={getLatencyStatus(performance.latency.milliseconds.p95)}
          detail={`Mean: ${performance.latency.seconds.mean}s`}
        />

        <MetricCard
          label="Error Rate"
          value={performance.errorRate.percentage.toFixed(1)}
          suffix="%"
          status={getErrorRateStatus(performance.errorRate.percentage)}
          detail={`${performance.errorRate.failedRequests} / ${performance.errorRate.totalRequests} failed`}
        />

        <MetricCard
          label="Cache Hit Rate"
          value={cache?.effectiveness.hitRate || "0.0%"}
          status={cache ? getCacheStatus(Number.parseFloat(cache.effectiveness.hitRate)) : "neutral"}
          detail={cache ? `${cache.effectiveness.totalHits} hits` : "No data"}
        />
      </div>

      {/* Cost and Quality */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard
          label="Total Cost"
          value={cost.cost.total.formatted}
          status="neutral"
          detail={`Daily: ${cost.projections.daily.formatted}`}
        />

        <MetricCard
          label="Quality Score"
          value={quality?.qualityScore.toFixed(1) || "N/A"}
          suffix="/100"
          status={quality ? getQualityStatus(quality.qualityScore) : "neutral"}
          detail={quality?.health.status || "No feedback yet"}
        />

        <MetricCard
          label="User Feedback"
          value={quality?.feedback.total || 0}
          status="neutral"
          detail={
            quality ? (
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-0.5">
                  <ThumbsUp className="h-2.5 w-2.5" />
                  {quality.feedback.thumbsUp}
                </span>
                <span className="flex items-center gap-0.5">
                  <ThumbsDown className="h-2.5 w-2.5" />
                  {quality.feedback.thumbsDown}
                </span>
              </div>
            ) : (
              "No feedback"
            )
          }
        />
      </div>

      {/* Health issues (if any) */}
      {health.health.issues.length > 0 && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/5 p-3">
          <div className="text-xs font-medium text-red-600 mb-2">⚠️ Health Issues</div>
          <ul className="text-[10px] text-muted-foreground space-y-1">
            {health.health.issues.map((issue, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: yup
              <li key={`health-issue-${issue}-${i}`}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
