import { cn } from "@/styles/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  status?: "good" | "warning" | "critical" | "neutral";
  detail?: string | React.ReactNode;
  trend?: "up" | "down" | "stable";
  className?: string;
}

export function MetricCard({ label, value, suffix, status = "neutral", detail, trend, className }: MetricCardProps) {
  const statusColors = {
    good: "border-green-500/50 bg-green-500/5",
    warning: "border-yellow-500/50 bg-yellow-500/5",
    critical: "border-red-500/50 bg-red-500/5",
    neutral: "border-border/50 bg-muted/30",
  };

  const statusIndicators = {
    good: "bg-green-500",
    warning: "bg-yellow-500",
    critical: "bg-red-500",
    neutral: "bg-muted-foreground",
  };

  const trendIcons = {
    up: <TrendingUp className="h-3 w-3" />,
    down: <TrendingDown className="h-3 w-3" />,
    stable: <Minus className="h-3 w-3" />,
  };

  return (
    <div className={cn("relative rounded-lg border p-3 transition-colors", statusColors[status], className)}>
      {/* Status indicator dot */}
      <div className={cn("absolute top-2 right-2 h-1.5 w-1.5 rounded-full", statusIndicators[status])} />

      {/* Label */}
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</div>

      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-mono font-semibold text-foreground">{value}</span>
        {suffix && <span className="text-xs font-mono text-muted-foreground">{suffix}</span>}
        {trend && (
          <span
            className={cn("ml-auto text-muted-foreground", {
              "text-green-500": trend === "up" && status === "good",
              "text-red-500": trend === "down" && status === "critical",
            })}
          >
            {trendIcons[trend]}
          </span>
        )}
      </div>

      {/* Detail */}
      {detail && <div className="text-[10px] text-muted-foreground mt-1 truncate">{detail}</div>}
    </div>
  );
}
