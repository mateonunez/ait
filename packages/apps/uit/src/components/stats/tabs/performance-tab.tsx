import { useStats } from "@/contexts/stats.context";
import { MetricCard } from "../metric-card";

export function PerformanceTab() {
  const { performance } = useStats();

  if (!performance) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading performance data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Latency percentiles */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Latency Percentiles
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="P50 (Median)"
            value={performance.latency.seconds.p50}
            suffix="s"
            detail={`${performance.latency.milliseconds.p50}ms`}
            status="good"
          />
          <MetricCard
            label="P75"
            value={performance.latency.seconds.p75}
            suffix="s"
            detail={`${performance.latency.milliseconds.p75}ms`}
            status="good"
          />
          <MetricCard
            label="P90"
            value={performance.latency.seconds.p90}
            suffix="s"
            detail={`${performance.latency.milliseconds.p90}ms`}
            status={performance.latency.milliseconds.p90 < 3000 ? "good" : "warning"}
          />
          <MetricCard
            label="P95"
            value={performance.latency.seconds.p95}
            suffix="s"
            detail={`${performance.latency.milliseconds.p95}ms`}
            status={performance.latency.milliseconds.p95 < 5000 ? "good" : "warning"}
          />
          <MetricCard
            label="P99"
            value={performance.latency.seconds.p99}
            suffix="s"
            detail={`${performance.latency.milliseconds.p99}ms`}
            status={performance.latency.milliseconds.p99 < 10000 ? "good" : "critical"}
          />
          <MetricCard
            label="Mean"
            value={performance.latency.seconds.mean}
            suffix="s"
            detail={`${performance.latency.milliseconds.mean.toFixed(0)}ms`}
            status="neutral"
          />
        </div>
      </div>

      {/* Throughput and errors */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Throughput & Errors
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Requests/Second"
            value={performance.throughput.requestsPerSecond.toFixed(2)}
            suffix="req/s"
            detail={`${performance.throughput.requestsPerMinute.toFixed(0)} req/min`}
            status="neutral"
          />
          <MetricCard
            label="Total Requests"
            value={performance.errorRate.totalRequests.toLocaleString()}
            detail={`${performance.latency.count} measured`}
            status="neutral"
          />
          <MetricCard
            label="Cache Hit Rate"
            value={performance.cache.hitRate.toFixed(1)}
            suffix="%"
            status={performance.cache.hitRate > 60 ? "good" : performance.cache.hitRate > 30 ? "warning" : "critical"}
            detail="From cache service"
          />
        </div>
      </div>

      {/* Error breakdown */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Error Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Error Rate"
            value={performance.errorRate.percentage.toFixed(2)}
            suffix="%"
            status={
              performance.errorRate.percentage < 1
                ? "good"
                : performance.errorRate.percentage < 5
                  ? "warning"
                  : "critical"
            }
            detail={`${performance.errorRate.failedRequests} failed`}
          />
          <MetricCard
            label="Successful Requests"
            value={performance.errorRate.successfulRequests.toLocaleString()}
            status="good"
            detail="No errors"
          />
          <MetricCard
            label="Failed Requests"
            value={performance.errorRate.failedRequests.toLocaleString()}
            status={performance.errorRate.failedRequests === 0 ? "good" : "critical"}
            detail="With errors"
          />
        </div>
      </div>

      {/* Latency range */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Latency Range</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Minimum"
            value={performance.latency.milliseconds.min.toFixed(0)}
            suffix="ms"
            status="good"
            detail="Fastest request"
          />
          <MetricCard
            label="Maximum"
            value={(performance.latency.milliseconds.max / 1000).toFixed(2)}
            suffix="s"
            status={performance.latency.milliseconds.max < 10000 ? "good" : "warning"}
            detail="Slowest request"
          />
          <MetricCard
            label="Sample Count"
            value={performance.latency.count.toLocaleString()}
            detail={performance.window}
            status="neutral"
          />
        </div>
      </div>
    </div>
  );
}
