import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis } from "recharts";
import { Music, MessageSquare, GitCommit, Twitter, Sparkles, ChevronDown, CheckSquare, FileText } from "lucide-react";
import { fetchDiscoveryStats } from "@/utils/stats-api.utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/styles/utils";
import { InsightsProvider, useInsights } from "@/contexts/insights.context";
import { AiInsightsPanel } from "./ai-insights-panel";

interface DailyActivity {
  date: string;
  [integrationKey: string]: number | string;
}

interface DiscoveryStatsData {
  timeRange: "week" | "month" | "year";
  data: DailyActivity[];
  totals: Record<string, number>;
}

// Dynamic chart config - will be populated based on available integrations
const getChartConfig = (integrationKeys: string[]): ChartConfig => {
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];
  const labels: Record<string, string> = {
    spotify: "Spotify",
    x: "X",
    slack: "Slack",
    github: "GitHub",
    linear: "Linear",
    notion: "Notion",
  };

  const config: ChartConfig = {};
  integrationKeys.forEach((key, index) => {
    config[key] = {
      label: labels[key] || key.charAt(0).toUpperCase() + key.slice(1),
      color: colors[index % colors.length]!,
    };
  });
  return config;
};

function DiscoveryStatsContent() {
  const [stats, setStats] = useState<DiscoveryStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [showReview, setShowReview] = useState(false);
  const { insights, isLoading: insightsLoading, setTimeRange: setContextTimeRange } = useInsights();

  // Sync local timeRange to context
  useEffect(() => {
    setContextTimeRange(timeRange);
  }, [timeRange, setContextTimeRange]);

  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoading(true);
        const data = await fetchDiscoveryStats(timeRange);
        setStats(data);
      } catch (error) {
        console.error("Failed to load discovery stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [timeRange]);

  // Dynamically generate items based on available integrations
  const integrationIcons: Record<string, typeof Music> = {
    spotify: Music,
    x: Twitter,
    slack: MessageSquare,
    github: GitCommit,
    linear: CheckSquare,
    notion: FileText,
  };

  const integrationLabels: Record<string, string> = {
    spotify: "Spotify Activity",
    x: "X Activity",
    slack: "Slack Activity",
    github: "GitHub Activity",
    linear: "Linear Activity",
    notion: "Notion Activity",
  };

  const integrationColors: Record<string, { text: string; bg: string }> = {
    spotify: { text: "text-green-500", bg: "bg-green-500/10" },
    x: { text: "text-blue-400", bg: "bg-blue-400/10" },
    slack: { text: "text-purple-500", bg: "bg-purple-500/10" },
    github: { text: "text-orange-500", bg: "bg-orange-500/10" },
    linear: { text: "text-indigo-500", bg: "bg-indigo-500/10" },
    notion: { text: "text-gray-500", bg: "bg-gray-500/10" },
  };

  const items = stats
    ? Object.keys(stats.totals).map((integrationKey) => ({
        id: integrationKey,
        label:
          integrationLabels[integrationKey] ||
          `${integrationKey.charAt(0).toUpperCase() + integrationKey.slice(1)} Activity`,
        icon: integrationIcons[integrationKey] || MessageSquare,
        color: integrationColors[integrationKey]?.text || "text-gray-500",
        bg: integrationColors[integrationKey]?.bg || "bg-gray-500/10",
        dataKey: integrationKey,
        data: stats.data || [],
        total: stats.totals[integrationKey] || 0,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6 mb-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Your Activity</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTimeRange("week")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              timeRange === "week"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("month")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              timeRange === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("year")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              timeRange === "year"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            Year
          </button>
        </div>
      </div>

      {/* Show Review CTA */}
      {!showReview && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg blur-xl" />
                <div className="relative p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-lg">AI-Powered Review</h4>
                  <Badge variant="secondary" className="text-xs">
                    AI
                  </Badge>
                  {insightsLoading && (
                    <Badge variant="outline" className="text-xs">
                      Loading...
                    </Badge>
                  )}
                  {insights && !insightsLoading && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                      Ready
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Get personalized insights, patterns, and recommendations based on your activity
                </p>
              </div>
            </div>
            <Button onClick={() => setShowReview(true)} className="ml-4 gap-2" size="lg" disabled={insightsLoading}>
              <Sparkles className="h-4 w-4" />
              Show Review
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* AI Insights Panel - Shown when CTA is clicked */}
      <AnimatePresence>
        {showReview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AiInsightsPanel timeRange={timeRange} onHide={() => setShowReview(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative overflow-hidden rounded-xl border bg-card p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg", item.bg)}>
                <item.icon className={cn("w-5 h-5", item.color)} />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{item.total}</div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>

            <ChartContainer config={getChartConfig(Object.keys(stats?.totals || {}))} className="h-[120px] w-full">
              <AreaChart data={item.data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${item.id})`} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={`var(--color-${item.id})`} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={false} />
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
                  stroke={`var(--color-${item.id})`}
                  strokeWidth={2}
                  fill={`url(#gradient-${item.id})`}
                />
              </AreaChart>
            </ChartContainer>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function DiscoveryStats() {
  const [timeRange] = useState<"week" | "month" | "year">("week");

  return (
    <InsightsProvider initialTimeRange={timeRange}>
      <DiscoveryStatsContent />
    </InsightsProvider>
  );
}
