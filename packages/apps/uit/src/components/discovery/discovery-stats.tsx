import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useInsights } from "@/contexts/insights.context";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { fetchDiscoveryStats } from "@/services/observability.service";
import { cn } from "@/styles/utils";
import { getLogger } from "@ait/core";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CheckSquare,
  FileText,
  GitCommit,
  MessageSquare,
  Minus,
  Music,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Twitter,
  Youtube,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AiInsightsPanel } from "./ai-insights-panel";
import type { DailyActivity, DiscoveryStatsData } from "@/services/discovery.service";

const logger = getLogger();

interface StatCardProps {
  item: {
    id: string;
    icon: typeof Music;
    label: string;
    color: string;
    bgGradient: string;
    borderColor: string;
    glowColor: string;
    total: number;
    totalDisplay: string;
    isLimitReached: boolean;
    average: number;
    trend: { value: number; direction: "up" | "down" | "neutral" };
    peakDay: string | null;
    data: DailyActivity[];
    dataKey: string;
  };
  index: number;
  chartConfig: ChartConfig;
  timeRange: "week" | "month" | "year";
}

// Dynamic chart config - will be populated based on available integrations
const getChartConfig = (integrationKeys: string[]): ChartConfig => {
  const colors: Record<string, string> = {
    spotify: "#1DB954",
    x: "#1DA1F2",
    slack: "#E01E5A",
    github: "#F97316",
    linear: "#5E6AD2",
    notion: "#787774",
    google: "#4285F4",
    youtube: "#FF0000",
  };

  const labels: Record<string, string> = {
    spotify: "Spotify",
    x: "X",
    slack: "Slack",
    github: "GitHub",
    linear: "Linear",
    notion: "Notion",
    google: "Google Calendar",
    youtube: "YouTube",
  };

  const config: ChartConfig = {};
  for (const key of integrationKeys) {
    config[key] = {
      label: labels[key] || key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[key] || "hsl(var(--chart-1))",
    };
  }
  return config;
};

// Integration metadata with brand colors and icons
const DEFAULT_META = {
  icon: Activity,
  label: "Integration",
  color: "hsl(var(--chart-1))",
  bgGradient: "from-primary/20 via-primary/5 to-transparent",
  borderColor: "border-primary/30",
  glowColor: "shadow-primary/20",
};

const INTEGRATIONS_META: Record<
  string,
  {
    icon: typeof Music;
    label: string;
    color: string;
    bgGradient: string;
    borderColor: string;
    glowColor: string;
  }
> = {
  spotify: {
    icon: Music,
    label: "Spotify",
    color: "#1DB954",
    bgGradient: "from-[#1DB954]/20 via-[#1DB954]/5 to-transparent",
    borderColor: "border-[#1DB954]/30",
    glowColor: "shadow-[#1DB954]/20",
  },
  x: {
    icon: Twitter,
    label: "X",
    color: "#1DA1F2",
    bgGradient: "from-[#1DA1F2]/20 via-[#1DA1F2]/5 to-transparent",
    borderColor: "border-[#1DA1F2]/30",
    glowColor: "shadow-[#1DA1F2]/20",
  },
  slack: {
    icon: MessageSquare,
    label: "Slack",
    color: "#E01E5A",
    bgGradient: "from-[#E01E5A]/20 via-[#E01E5A]/5 to-transparent",
    borderColor: "border-[#E01E5A]/30",
    glowColor: "shadow-[#E01E5A]/20",
  },
  github: {
    icon: GitCommit,
    label: "GitHub",
    color: "#F97316",
    bgGradient: "from-[#F97316]/20 via-[#F97316]/5 to-transparent",
    borderColor: "border-[#F97316]/30",
    glowColor: "shadow-[#F97316]/20",
  },
  linear: {
    icon: CheckSquare,
    label: "Linear",
    color: "#5E6AD2",
    bgGradient: "from-[#5E6AD2]/20 via-[#5E6AD2]/5 to-transparent",
    borderColor: "border-[#5E6AD2]/30",
    glowColor: "shadow-[#5E6AD2]/20",
  },
  notion: {
    icon: FileText,
    label: "Notion",
    color: "#787774",
    bgGradient: "from-[#787774]/20 via-[#787774]/5 to-transparent",
    borderColor: "border-[#787774]/30",
    glowColor: "shadow-[#787774]/20",
  },
  google: {
    icon: Activity,
    label: "Google Calendar",
    color: "#4285F4",
    bgGradient: "from-[#4285F4]/20 via-[#4285F4]/5 to-transparent",
    borderColor: "border-[#4285F4]/30",
    glowColor: "shadow-[#4285F4]/20",
  },
  youtube: {
    icon: Youtube,
    label: "YouTube",
    color: "#FF0000",
    bgGradient: "from-[#FF0000]/20 via-[#FF0000]/5 to-transparent",
    borderColor: "border-[#FF0000]/30",
    glowColor: "shadow-[#FF0000]/20",
  },
};

function getIntegrationMeta(key: string) {
  return INTEGRATIONS_META[key] || { ...DEFAULT_META, label: key.charAt(0).toUpperCase() + key.slice(1) };
}

function DiscoveryStatsContent() {
  const [stats, setStats] = useState<DiscoveryStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const { insights, isLoading: insightsLoading, timeRange, setTimeRange } = useInsights();
  const { isVendorGranted, isLoading: isStatusLoading } = useConnectionStatus();

  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoading(true);
        const data = await fetchDiscoveryStats(timeRange);
        setStats(data);
      } catch (error) {
        logger.error("Failed to load discovery stats:", { error });
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [timeRange]);

  // Calculate trend for each integration
  const calculateTrend = (
    data: DailyActivity[],
    key: string,
  ): { value: number; direction: "up" | "down" | "neutral" } => {
    if (!data || data.length < 2) return { value: 0, direction: "neutral" };

    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);

    const firstSum = firstHalf.reduce((sum, d) => sum + (Number(d[key]) || 0), 0);
    const secondSum = secondHalf.reduce((sum, d) => sum + (Number(d[key]) || 0), 0);

    if (firstSum === 0 && secondSum === 0) return { value: 0, direction: "neutral" };
    if (firstSum === 0) return { value: 100, direction: "up" };

    const change = ((secondSum - firstSum) / firstSum) * 100;
    return {
      value: Math.abs(Math.round(change)),
      direction: change > 5 ? "up" : change < -5 ? "down" : "neutral",
    };
  };

  // Get peak activity day
  const getPeakDay = (data: DailyActivity[], key: string): string | null => {
    if (!data || data.length === 0) return null;
    const peak = data.reduce((max, d) => ((Number(d[key]) || 0) > (Number(max[key]) || 0) ? d : max), data[0]);
    if (!peak || Number(peak[key]) === 0) return null;
    return new Date(peak.date).toLocaleDateString("en-US", { weekday: "short" });
  };

  // Format large numbers with K/M suffixes or +1000 indicator
  const formatCount = (count: number, isLimitReached: boolean): string => {
    if (isLimitReached && count >= 1000) {
      return `${count.toLocaleString()}+`;
    }
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 10000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toLocaleString();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to memoize the stat items
  const statItems = useMemo(() => {
    if (!stats) return [];

    return Object.keys(stats.totals)
      .map((key) => {
        const meta = getIntegrationMeta(key);

        const trend = calculateTrend(stats.data, key);
        const peakDay = getPeakDay(stats.data, key);
        const total = stats.totals[key] || 0;
        const isLimitReached = total >= 1000;
        const average = stats.data.length > 0 ? Math.round(total / stats.data.length) : 0;

        return {
          id: key,
          ...meta,
          total,
          totalDisplay: formatCount(total, isLimitReached),
          isLimitReached,
          average,
          trend,
          peakDay,
          data: stats.data,
          dataKey: key,
        };
      })
      .filter((item) => isVendorGranted(item.id as any))
      .sort((a, b) => b.total - a.total);
  }, [stats, isVendorGranted]);

  const chartConfig = useMemo(() => getChartConfig(Object.keys(stats?.totals || {})), [stats]);

  if (isLoading || isStatusLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1 flex flex-col items-center sm:items-start">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex justify-center sm:justify-end">
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 py-2 justify-center sm:justify-start">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[220px] w-[280px] sm:w-[300px] shrink-0 rounded-2xl" />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Your Activity
          </h3>
          <p className="text-sm text-muted-foreground">Track your digital footprint across all integrations</p>
        </div>

        {/* Time Range ToggleGroup */}
        <ToggleGroup
          type="single"
          value={timeRange}
          onValueChange={(value) => setTimeRange(value as "week" | "month" | "year")}
          className="gap-1"
        >
          {(["week", "month", "year"] as const).map((range) => (
            <ToggleGroupItem
              key={range}
              value={range}
              className="data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
              aria-label={`Select ${range} view`}
            >
              <span className="capitalize">{range}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* AI Review CTA */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300",
          showReview
            ? "bg-gradient-to-br from-violet-500/10 via-background to-background border-violet-500/30"
            : "bg-gradient-to-br from-primary/5 via-background to-background border-border/50 hover:border-violet-500/30",
        )}
      >
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-violet-500/20 to-transparent rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <motion.div
                className="relative shrink-0"
                animate={{ rotate: showReview ? 180 : 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-blue-500/30 rounded-xl blur-xl" />
                <div className="relative p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
                  <Sparkles className="h-6 w-6 text-violet-400" />
                </div>
              </motion.div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h4 className="font-bold text-lg">AI-Powered Review</h4>
                  <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/30">
                    <Zap className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                  {insightsLoading && (
                    <Badge variant="outline" className="text-xs animate-pulse">
                      Analyzing...
                    </Badge>
                  )}
                  {insights && !insightsLoading && (
                    <Badge
                      variant="outline"
                      className="text-xs text-emerald-500 border-emerald-500/50 bg-emerald-500/10"
                    >
                      Ready
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  Get personalized insights, patterns, and recommendations based on your {timeRange}ly activity
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowReview(!showReview)}
              className={cn(
                "gap-2 rounded-xl transition-all duration-300 shrink-0",
                showReview
                  ? "bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30"
                  : "bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25",
              )}
              size="lg"
              disabled={insightsLoading}
              aria-expanded={showReview}
              aria-controls="ai-insights-panel"
            >
              <Sparkles className="h-4 w-4" />
              {showReview ? "Hide Review" : "Show Review"}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* AI Insights Panel */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            id="ai-insights-panel"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <AiInsightsPanel timeRange={timeRange} onHide={() => setShowReview(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Stats - Horizontal Scroll */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 sm:gap-6 py-4 px-4 sm:px-6">
              {statItems.map((item, index) => (
                <div key={item.id} className="w-[280px] sm:w-[300px] shrink-0">
                  <StatCard item={item} index={index} chartConfig={chartConfig} timeRange={timeRange} />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary Bar */}
      {statItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-muted/30 border border-border/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-muted-foreground">Total Activity:</span>
            <span className="font-bold text-foreground">
              {(() => {
                const totalSum = statItems.reduce((sum, item) => sum + item.total, 0);
                const anyLimitReached = statItems.some((item) => item.isLimitReached);
                return formatCount(totalSum, anyLimitReached);
              })()}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4 shrink-0" decorative />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Active Integrations:</span>
            <span className="font-bold text-foreground">{statItems.filter((item) => item.total > 0).length}</span>
          </div>
          <Separator orientation="vertical" className="h-4 shrink-0 hidden sm:block" decorative />
          <div className="hidden items-center gap-2 text-sm sm:flex">
            <span className="text-muted-foreground">Most Active:</span>
            <span className="font-bold text-foreground">{statItems[0]?.label || "None"}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatCard({ item, index, chartConfig, timeRange }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;

  const TrendIcon = item.trend.direction === "up" ? TrendingUp : item.trend.direction === "down" ? TrendingDown : Minus;
  const trendColorClass =
    item.trend.direction === "up"
      ? "text-emerald-500"
      : item.trend.direction === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  const handleClick = () => {
    if (item.total > 0) {
      window.location.href = `/integrations/${item.id}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border transition-all duration-500 h-full cursor-pointer",
        "bg-gradient-to-br",
        item.bgGradient,
        item.borderColor,
        isHovered && `shadow-lg ${item.glowColor}`,
      )}
      aria-labelledby={`stat-${item.id}-title`}
    >
      {/* Animated glow effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${item.color}15 0%, transparent 70%)`,
        }}
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-80"
        style={{ backgroundColor: item.color }}
        aria-hidden="true"
      />

      <div className="relative p-4 sm:p-5 flex flex-col h-full min-h-[220px]">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <motion.div
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300 shrink-0",
              "bg-background/80 backdrop-blur-sm border border-border/50",
            )}
            whileHover={{ scale: 1.05 }}
            style={{
              boxShadow: isHovered ? `0 0 20px ${item.color}30` : "none",
            }}
            aria-hidden="true"
          >
            <Icon className="w-5 h-5" style={{ color: item.color }} />
          </motion.div>

          {/* Trend Badge */}
          {item.trend.value > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                "bg-background/80 backdrop-blur-sm border border-border/50",
              )}
              aria-label={`${item.trend.direction === "up" ? "Up" : "Down"} ${item.trend.value}% trend`}
            >
              <TrendIcon className={cn("h-3 w-3", trendColorClass)} aria-hidden="true" />
              <span className={trendColorClass}>{item.trend.value}%</span>
            </motion.div>
          )}
        </div>

        {/* Stats */}
        <div className="mb-3">
          <motion.div
            className="text-3xl font-bold tracking-tight flex items-baseline gap-1"
            key={item.total}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            id={`stat-${item.id}-title`}
          >
            <span aria-label={`${item.totalDisplay} ${item.label} activity`}>{item.totalDisplay}</span>
            {item.isLimitReached && (
              <span
                className="text-xs font-normal text-muted-foreground"
                title="May be higher - limited to 1000 per request"
                aria-label="Limit reached"
              >
                (limit)
              </span>
            )}
          </motion.div>
          <p className="text-sm text-muted-foreground font-medium">{item.label} Activity</p>
        </div>

        {/* Mini Stats */}
        <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="opacity-70">Avg:</span>
            <span className="font-semibold text-foreground" aria-label={`${item.average} average per day`}>
              {item.average}/day
            </span>
          </div>
          {item.peakDay && (
            <>
              <Separator orientation="vertical" className="h-3 shrink-0" decorative />
              <div className="flex items-center gap-1">
                <span className="opacity-70">Peak:</span>
                <span className="font-semibold text-foreground" aria-label={`Peak on ${item.peakDay}`}>
                  {item.peakDay}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[80px] mt-auto">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={item.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={item.color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={item.color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      }}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey={item.dataKey}
                  stroke={item.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${item.id})`}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: item.color,
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Hover overlay with more info */}
        <AnimatePresence>
          {isHovered && item.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">This {timeRange}</span>
                <span className="font-semibold" style={{ color: item.color }}>
                  View details →
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function DiscoveryStats() {
  return <DiscoveryStatsContent />;
}
