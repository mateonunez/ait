import { useStats } from "@/contexts/stats.context";
import { MetricCard } from "../metric-card";

export function CacheTab() {
  const { cache } = useStats();

  if (!cache) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading cache data...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Effectiveness metrics */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Cache Effectiveness
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Hit Rate"
            value={cache.effectiveness.hitRate}
            status={
              Number.parseFloat(cache.effectiveness.hitRate) > 60
                ? "good"
                : Number.parseFloat(cache.effectiveness.hitRate) > 30
                  ? "warning"
                  : "critical"
            }
            detail={`${cache.effectiveness.totalHits} hits`}
          />
          <MetricCard
            label="Total Hits"
            value={cache.effectiveness.totalHits.toLocaleString()}
            status="good"
            detail="Cache served"
          />
          <MetricCard
            label="Total Misses"
            value={cache.effectiveness.totalMisses.toLocaleString()}
            status="neutral"
            detail="Full retrieval"
          />
        </div>
      </div>

      {/* Performance savings */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Performance Savings
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Avg Latency Saved"
            value={cache.effectiveness.avgLatencySaving}
            status="good"
            detail="Per cache hit"
          />
          <MetricCard
            label="Total Time Saved"
            value={cache.effectiveness.totalLatencySaved}
            status="good"
            detail={cache.window}
          />
          <MetricCard
            label="Retrievals Saved"
            value={cache.costSavings.retrievalsSaved.toLocaleString()}
            status="good"
            detail="Avoided lookups"
          />
        </div>
      </div>

      {/* Cost savings */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cost Savings</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Embeddings Saved"
            value={cache.costSavings.embeddingsSaved}
            status="good"
            detail={cache.window}
          />
          <MetricCard
            label="Daily Projection"
            value={cache.costSavings.estimatedSavingsPerDay}
            status="good"
            detail="Estimated savings"
          />
          <MetricCard
            label="Cache Size"
            value={cache.size.estimatedMemoryMB}
            suffix="MB"
            status="neutral"
            detail={`${cache.size.entryCount} / ${cache.size.maxEntries} entries`}
          />
        </div>
      </div>

      {/* Cache management */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cache Management</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Entry Count"
            value={cache.size.entryCount}
            detail={`Max: ${cache.size.maxEntries}`}
            status="neutral"
          />
          <MetricCard
            label="Eviction Count"
            value={cache.size.evictionCount}
            detail="LRU evictions"
            status={cache.size.evictionCount > 100 ? "warning" : "neutral"}
          />
          <MetricCard
            label="Memory Usage"
            value={cache.size.estimatedMemoryMB}
            suffix="MB"
            status="neutral"
            detail="Estimated"
          />
        </div>
      </div>

      {/* Top cached queries */}
      {cache.topQueries.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Top Cached Queries
          </h3>
          <div className="space-y-2">
            {cache.topQueries.slice(0, 5).map((query, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: yup
              <div
                key={`top-cached-query-${query.query}-${i}`}
                className="flex items-center justify-between p-2 rounded border border-border/50 bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground truncate">{query.query}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {query.hits} hits • {query.avgDocuments} docs avg
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground ml-2">
                  {new Date(query.lastHit).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
