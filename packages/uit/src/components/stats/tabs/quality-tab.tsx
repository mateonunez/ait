import { useStats } from "@/contexts/stats.context";
import { MetricCard } from "../metric-card";
import { ThumbsUp, ThumbsDown } from "lucide-react";

export function QualityTab() {
  const { quality } = useStats();

  if (!quality) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading quality data...
      </div>
    );
  }

  const getQualityStatus = (score: number): "good" | "warning" | "critical" => {
    if (score >= 75) return "good";
    if (score >= 40) return "warning";
    return "critical";
  };

  return (
    <div className="space-y-6">
      {/* Quality overview */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quality Overview</h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Quality Score"
            value={quality.qualityScore.toFixed(1)}
            suffix="/100"
            status={getQualityStatus(quality.qualityScore)}
            detail={quality.health.status}
          />
          <MetricCard label="Total Feedback" value={quality.feedback.total} status="neutral" detail={quality.window} />
          <MetricCard
            label="Thumbs Up Rate"
            value={quality.feedback.thumbsUpRate}
            status={
              Number.parseFloat(quality.feedback.thumbsUpRate) > 80
                ? "good"
                : Number.parseFloat(quality.feedback.thumbsUpRate) > 60
                  ? "warning"
                  : "critical"
            }
            detail="User satisfaction"
          />
        </div>
      </div>

      {/* Quality degradation warning */}
      {quality.health.isDegrading && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-3">
          <div className="text-xs font-medium text-yellow-600 mb-1">⚠️ Quality Degrading</div>
          <div className="text-[10px] text-muted-foreground">
            Recent quality score is significantly lower than the historical average. Review problematic traces below.
          </div>
        </div>
      )}

      {/* Feedback breakdown */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Feedback Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Thumbs Up"
            value={quality.feedback.thumbsUp}
            status="good"
            detail={
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-2.5 w-2.5" />
                Positive
              </div>
            }
          />
          <MetricCard
            label="Thumbs Down"
            value={quality.feedback.thumbsDown}
            status={quality.feedback.thumbsDown > 0 ? "critical" : "good"}
            detail={
              <div className="flex items-center gap-1">
                <ThumbsDown className="h-2.5 w-2.5" />
                Negative
              </div>
            }
          />
          <MetricCard label="Neutral" value={quality.feedback.neutral} status="neutral" detail="No preference" />
        </div>
      </div>

      {/* Feedback distribution */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Feedback Distribution
        </h3>
        <div className="space-y-2">
          <div className="p-3 rounded border border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground flex items-center gap-1.5">
                <ThumbsUp className="h-3 w-3 text-green-600" />
                Positive
              </span>
              <span className="text-xs font-mono text-foreground">{quality.feedback.thumbsUp}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${(quality.feedback.thumbsUp / quality.feedback.total) * 100}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {((quality.feedback.thumbsUp / quality.feedback.total) * 100).toFixed(1)}% of feedback
            </div>
          </div>

          <div className="p-3 rounded border border-border/50 bg-muted/30">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground flex items-center gap-1.5">
                <ThumbsDown className="h-3 w-3 text-red-600" />
                Negative
              </span>
              <span className="text-xs font-mono text-foreground">{quality.feedback.thumbsDown}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500"
                style={{
                  width: `${(quality.feedback.thumbsDown / quality.feedback.total) * 100}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {((quality.feedback.thumbsDown / quality.feedback.total) * 100).toFixed(1)}% of feedback
            </div>
          </div>
        </div>
      </div>

      {/* Problematic traces */}
      {quality.problematicTraces.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Problematic Traces
          </h3>
          <div className="space-y-2">
            {quality.problematicTraces.map((trace) => (
              <div key={trace.traceId} className="p-3 rounded border border-red-500/50 bg-red-500/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 uppercase">
                    {trace.rating}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(trace.timestamp).toLocaleString()}
                  </span>
                </div>
                {trace.comment && <div className="text-xs text-foreground mt-2">{trace.comment}</div>}
                <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate">Trace: {trace.traceId}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality trend */}
      {quality.trend.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quality Trend (24h)
          </h3>
          <div className="space-y-1">
            {quality.trend.slice(-5).map((point, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: yup
              <div
                key={`quality-trend-${point.timestamp}-${i}`}
                className="flex items-center gap-2 p-2 rounded border border-border/50 bg-muted/30"
              >
                <div className="text-[10px] text-muted-foreground w-32">
                  {new Date(point.timestamp).toLocaleString()}
                </div>
                <div className="flex-1">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full",
                        point.score >= 75 ? "bg-green-500" : point.score >= 40 ? "bg-yellow-500" : "bg-red-500",
                      )}
                      style={{ width: `${point.score}%` }}
                    />
                  </div>
                </div>
                <div className="text-xs font-mono text-foreground w-12 text-right">{point.score.toFixed(0)}</div>
                <div className="text-[10px] text-muted-foreground w-16 text-right">{point.totalFeedback} total</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
