import { useStats } from "@/contexts/stats.context";
import { MetricCard } from "../metric-card";

export function CostTab() {
  const { cost } = useStats();

  if (!cost) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading cost data...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current costs */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Current Costs</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Total Cost" value={cost.cost.total.formatted} status="neutral" detail="Since startup" />
          <MetricCard
            label="Generation Cost"
            value={cost.cost.generation.formatted}
            status="neutral"
            detail={`${cost.cost.generation.tokens.toLocaleString()} tokens`}
          />
          <MetricCard
            label="Embedding Cost"
            value={cost.cost.embedding.formatted}
            status="neutral"
            detail={`${cost.cost.embedding.tokens.toLocaleString()} tokens`}
          />
        </div>
      </div>

      {/* Token usage */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Token Usage</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Generation Tokens"
            value={cost.cost.generation.tokens.toLocaleString()}
            status="neutral"
            detail="LLM responses"
          />
          <MetricCard
            label="Embedding Tokens"
            value={cost.cost.embedding.tokens.toLocaleString()}
            status="neutral"
            detail="Vector embeddings"
          />
          <MetricCard
            label="Total Tokens"
            value={(cost.cost.generation.tokens + cost.cost.embedding.tokens).toLocaleString()}
            status="neutral"
            detail="Combined usage"
          />
        </div>
      </div>

      {/* Projections */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cost Projections</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Daily Projection"
            value={cost.projections.daily.formatted}
            status={cost.projections.daily.amount > 1 ? "warning" : "good"}
            detail="Based on current usage"
          />
          <MetricCard
            label="Monthly Projection"
            value={cost.projections.monthly.formatted}
            status={
              cost.projections.monthly.amount > 30
                ? "critical"
                : cost.projections.monthly.amount > 10
                  ? "warning"
                  : "good"
            }
            detail="Estimated cost"
          />
          <MetricCard label="Currency" value={cost.cost.total.currency} status="neutral" detail="USD" />
        </div>
      </div>

      {/* Cost breakdown chart (text-based) */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cost Breakdown</h3>
        <div className="space-y-2">
          <div className="p-3 rounded border border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground">Generation</span>
              <span className="text-xs font-mono text-foreground">{cost.cost.generation.formatted}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${(cost.cost.generation.amount / cost.cost.total.amount) * 100}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {((cost.cost.generation.amount / cost.cost.total.amount) * 100).toFixed(1)}% of total
            </div>
          </div>

          <div className="p-3 rounded border border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground">Embeddings</span>
              <span className="text-xs font-mono text-foreground">{cost.cost.embedding.formatted}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{
                  width: `${(cost.cost.embedding.amount / cost.cost.total.amount) * 100}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {((cost.cost.embedding.amount / cost.cost.total.amount) * 100).toFixed(1)}% of total
            </div>
          </div>
        </div>
      </div>

      {/* Cost efficiency */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cost Efficiency</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Cost per 1K Tokens"
            value={(
              (cost.cost.total.amount / (cost.cost.generation.tokens + cost.cost.embedding.tokens)) *
              1000
            ).toFixed(4)}
            suffix="$"
            status="neutral"
            detail="Average rate"
          />
          <MetricCard
            label="Generation Rate"
            value={((cost.cost.generation.amount / cost.cost.generation.tokens) * 1000).toFixed(4)}
            suffix="$/1K"
            status="neutral"
            detail="LLM tokens"
          />
          <MetricCard
            label="Embedding Rate"
            value={((cost.cost.embedding.amount / cost.cost.embedding.tokens) * 1000).toFixed(4)}
            suffix="$/1K"
            status="neutral"
            detail="Vector tokens"
          />
        </div>
      </div>
    </div>
  );
}
