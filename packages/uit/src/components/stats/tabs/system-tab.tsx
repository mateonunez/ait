import { useStats } from "@/contexts/stats.context";
import { MetricCard } from "../metric-card";

export function SystemTab() {
  const { system } = useStats();

  if (!system) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading system data...</div>
    );
  }

  const getMemoryStatus = (heapUsed: string, heapTotal: string): "good" | "warning" | "critical" => {
    const used = Number.parseFloat(heapUsed);
    const total = Number.parseFloat(heapTotal);
    const percentage = (used / total) * 100;

    if (percentage < 70) return "good";
    if (percentage < 85) return "warning";
    return "critical";
  };

  const heapUsedMB = Number.parseFloat(system.memory.heapUsed);
  const heapTotalMB = Number.parseFloat(system.memory.heapTotal);
  const heapPercentage = (heapUsedMB / heapTotalMB) * 100;

  return (
    <div className="space-y-6">
      {/* Process information */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Process Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Uptime"
            value={system.process.uptime}
            status="good"
            detail={`${system.process.uptimeSeconds.toFixed(0)}s`}
          />
          <MetricCard label="Process ID" value={system.process.pid} status="neutral" detail="PID" />
          <MetricCard label="Node Version" value={system.process.nodeVersion} status="neutral" detail="Runtime" />
        </div>
      </div>

      {/* Platform information */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Platform</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard label="Platform" value={system.process.platform} status="neutral" detail="Operating system" />
          <MetricCard label="Architecture" value={system.process.arch} status="neutral" detail="CPU architecture" />
          <MetricCard label="Runtime" value="Node.js" status="neutral" detail={system.process.nodeVersion} />
        </div>
      </div>

      {/* Memory usage */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Memory Usage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard label="RSS (Total)" value={system.memory.rss} status="neutral" detail="Resident set size" />
          <MetricCard
            label="Heap Used"
            value={system.memory.heapUsed}
            status={getMemoryStatus(system.memory.heapUsed, system.memory.heapTotal)}
            detail={`${heapPercentage.toFixed(1)}% of heap`}
          />
          <MetricCard label="Heap Total" value={system.memory.heapTotal} status="neutral" detail="Allocated heap" />
        </div>
      </div>

      {/* Memory details */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Memory Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard label="External" value={system.memory.external} status="neutral" detail="C++ objects" />
          <MetricCard label="Heap Limit" value={system.memory.heapTotal} status="neutral" detail="Max heap size" />
          <MetricCard
            label="Memory Utilization"
            value={heapPercentage.toFixed(1)}
            suffix="%"
            status={getMemoryStatus(system.memory.heapUsed, system.memory.heapTotal)}
            detail="Of heap total"
          />
        </div>
      </div>

      {/* Heap usage visualization */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Heap Usage</h3>
        <div className="p-3 rounded border border-border/50 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-foreground">Heap Memory</span>
            <span className="text-xs font-mono text-foreground">
              {system.memory.heapUsed} / {system.memory.heapTotal}
            </span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                heapPercentage < 70 ? "bg-green-500" : heapPercentage < 85 ? "bg-yellow-500" : "bg-red-500",
              )}
              style={{ width: `${heapPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
            <span>{heapPercentage.toFixed(1)}% utilized</span>
            <span>{(heapTotalMB - heapUsedMB).toFixed(2)} MB free</span>
          </div>
        </div>
      </div>

      {/* System timestamp */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">System Timestamp</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            label="Current Time"
            value={new Date(system.timestamp).toLocaleTimeString()}
            status="neutral"
            detail={new Date(system.timestamp).toLocaleDateString()}
          />
          <MetricCard
            label="ISO Timestamp"
            value={new Date(system.timestamp).toISOString().split("T")[1].slice(0, 8)}
            status="neutral"
            detail="UTC time"
          />
          <MetricCard
            label="Unix Timestamp"
            value={new Date(system.timestamp).getTime().toString().slice(0, -3)}
            status="neutral"
            detail="Seconds since epoch"
          />
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
