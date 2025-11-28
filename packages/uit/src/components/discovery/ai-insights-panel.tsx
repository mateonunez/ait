import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  AlertCircle,
  ChevronUp,
  Zap,
  Brain,
  Target,
  ArrowRight,
} from "lucide-react";
import { useInsights } from "@/contexts/insights.context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/styles/utils";
import type { InsightCorrelation, InsightAnomaly, InsightRecommendation } from "@ait/ai-sdk";

interface AiInsightsPanelProps {
  timeRange: "week" | "month" | "year";
  onHide?: () => void;
}

export function AiInsightsPanel({ timeRange, onHide }: AiInsightsPanelProps) {
  const { insights, isLoading, error, timeRange: contextTimeRange, setTimeRange, refreshInsights } = useInsights();

  // Sync time range prop to context (only update if different to avoid unnecessary re-renders)
  useEffect(() => {
    if (contextTimeRange !== timeRange) {
      setTimeRange(timeRange);
    }
  }, [timeRange, contextTimeRange, setTimeRange]);

  // Loading state
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-background backdrop-blur-sm">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-violet-500/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-xl animate-pulse" />
              <div className="relative p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Brain className="h-6 w-6 text-violet-400 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 via-background to-background">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg">Failed to Load Insights</h4>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={refreshInsights} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // No insights yet
  if (!insights) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-muted/30 backdrop-blur-sm">
        <div className="p-8 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-muted/50 mb-4">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
          </div>
          <h4 className="font-semibold text-lg mb-2">Loading Insights</h4>
          <p className="text-sm text-muted-foreground">Analyzing your activity patterns...</p>
        </div>
      </div>
    );
  }

  const { summary, correlations, anomalies, recommendations, meta } = insights;

  // Get sentiment styling
  const getSentimentStyles = (sentiment: "positive" | "neutral" | "negative") => {
    switch (sentiment) {
      case "positive":
        return {
          border: "border-emerald-500/30",
          bg: "from-emerald-500/10 via-background to-background",
          glow: "from-emerald-500/20",
        };
      case "negative":
        return {
          border: "border-red-500/30",
          bg: "from-red-500/10 via-background to-background",
          glow: "from-red-500/20",
        };
      default:
        return {
          border: "border-violet-500/30",
          bg: "from-violet-500/10 via-background to-background",
          glow: "from-violet-500/20",
        };
    }
  };

  // Get time range label
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "week":
        return "Your Week in Review";
      case "month":
        return "Your Month in Review";
      case "year":
        return "Your Year in Review";
      default:
        return "Your Activity Review";
    }
  };

  const styles = getSentimentStyles(summary?.sentiment || "neutral");

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={timeRange}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "relative overflow-hidden rounded-2xl border backdrop-blur-sm",
          styles.border,
          `bg-gradient-to-br ${styles.bg}`,
        )}
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={cn(
              "absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-50",
              `bg-gradient-to-bl ${styles.glow} to-transparent`,
            )}
          />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="relative"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-xl" />
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
                    <Brain className="h-6 w-6 text-violet-400" />
                  </div>
                </motion.div>
                <div>
                  <h3 className="font-bold text-xl flex items-center gap-2">
                    {getTimeRangeLabel()}
                    <Sparkles className="h-4 w-4 text-violet-400" />
                  </h3>
                  <p className="text-sm text-muted-foreground">AI-generated insights from your activity</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {meta && (
                  <Badge variant="secondary" className="text-xs bg-background/50 backdrop-blur-sm">
                    <Zap className="h-3 w-3 mr-1 text-yellow-500" />
                    {meta.cacheHit ? "Cached" : `${meta.generationTimeMs}ms`}
                  </Badge>
                )}
                {onHide && (
                  <Button variant="ghost" size="icon" onClick={onHide} className="h-8 w-8 rounded-lg">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-6">
            {/* AI Summary - Hero Section */}
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 p-5"
              >
                <div className="flex items-start gap-4">
                  <motion.span
                    className="text-5xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                  >
                    {summary.emoji}
                  </motion.span>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-bold text-xl mb-1">{summary.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{summary.description}</p>
                    </div>

                    {/* Highlights */}
                    {summary.highlights && summary.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {summary.highlights.map((highlight, idx) => (
                          <motion.div
                            key={highlight}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + idx * 0.05 }}
                          >
                            <Badge
                              variant="secondary"
                              className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20"
                            >
                              {highlight}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Insights Grid */}
            {(correlations.length > 0 || anomalies.length > 0 || recommendations.length > 0) && (
              <div className="space-y-6">
                {/* Recommendations Section */}
                {recommendations.length > 0 && (
                  <InsightSection
                    icon={Lightbulb}
                    title="Suggestions"
                    count={recommendations.length}
                    iconColor="text-amber-500"
                    bgColor="bg-amber-500/10"
                    borderColor="border-amber-500/20"
                    delay={0.2}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {recommendations.map((rec, idx) => (
                        <InsightCard
                          key={`rec-${rec.category}-${rec.action}-${idx}`}
                          delay={0.25 + idx * 0.05}
                          accentColor="amber"
                        >
                          <RecommendationInsight recommendation={rec} />
                        </InsightCard>
                      ))}
                    </div>
                  </InsightSection>
                )}

                {/* Correlations Section */}
                {correlations.length > 0 && (
                  <InsightSection
                    icon={TrendingUp}
                    title="Patterns Detected"
                    count={correlations.length}
                    iconColor="text-blue-500"
                    bgColor="bg-blue-500/10"
                    borderColor="border-blue-500/20"
                    delay={0.3}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {correlations.map((corr, idx) => (
                        <InsightCard
                          key={`corr-${corr.integrations.join("-")}-${corr.strength}-${idx}`}
                          delay={0.35 + idx * 0.05}
                          accentColor="blue"
                        >
                          <CorrelationInsight correlation={corr} />
                        </InsightCard>
                      ))}
                    </div>
                  </InsightSection>
                )}

                {/* Anomalies Section */}
                {anomalies.length > 0 && (
                  <InsightSection
                    icon={AlertTriangle}
                    title="Activity Alerts"
                    count={anomalies.length}
                    iconColor="text-orange-500"
                    bgColor="bg-orange-500/10"
                    borderColor="border-orange-500/20"
                    delay={0.4}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {anomalies.map((anom, idx) => (
                        <InsightCard
                          key={`anom-${anom.integration}-${anom.metric}-${idx}`}
                          delay={0.45 + idx * 0.05}
                          accentColor="orange"
                        >
                          <AnomalyInsight anomaly={anom} />
                        </InsightCard>
                      ))}
                    </div>
                  </InsightSection>
                )}
              </div>
            )}

            {/* Empty state */}
            {!summary && correlations.length === 0 && anomalies.length === 0 && recommendations.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="inline-flex p-4 rounded-2xl bg-muted/50 mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-semibold text-lg mb-2">Not Enough Data</h4>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Keep using your integrations to unlock AI-powered insights and personalized recommendations!
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Insight Section Wrapper
 */
interface InsightSectionProps {
  icon: React.ElementType;
  title: string;
  count: number;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  delay: number;
  children: React.ReactNode;
}

function InsightSection({
  icon: Icon,
  title,
  count,
  iconColor,
  bgColor,
  borderColor,
  delay,
  children,
}: InsightSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", bgColor, borderColor, "border")}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <h4 className="font-semibold">{title}</h4>
        <Badge variant="secondary" className="text-xs">
          {count}
        </Badge>
      </div>
      {children}
    </motion.div>
  );
}

/**
 * Insight Card Component
 */
interface InsightCardProps {
  delay: number;
  accentColor: "amber" | "blue" | "orange" | "purple";
  children: React.ReactNode;
}

function InsightCard({ delay, accentColor, children }: InsightCardProps) {
  const accentColors = {
    amber: "hover:border-amber-500/30 hover:shadow-amber-500/5",
    blue: "hover:border-blue-500/30 hover:shadow-blue-500/5",
    orange: "hover:border-orange-500/30 hover:shadow-orange-500/5",
    purple: "hover:border-purple-500/30 hover:shadow-purple-500/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "group rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 transition-all duration-300",
        "hover:shadow-lg",
        accentColors[accentColor],
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * Correlation Insight Display
 */
function CorrelationInsight({ correlation }: { correlation: InsightCorrelation }) {
  return (
    <div className="space-y-3">
      <p className="font-semibold text-foreground leading-tight">{correlation.pattern}</p>
      <p className="text-sm text-muted-foreground">{correlation.description}</p>
      {correlation.example && (
        <div className="text-xs text-muted-foreground italic border-l-2 border-blue-500/50 pl-3 py-1 bg-blue-500/5 rounded-r-lg">
          {correlation.example}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
          {correlation.strength}% match
        </Badge>
        {correlation.integrations.map((integration) => (
          <Badge key={integration} variant="outline" className="text-xs capitalize">
            {integration}
          </Badge>
        ))}
      </div>
    </div>
  );
}

/**
 * Anomaly Insight Display
 */
function AnomalyInsight({ anomaly }: { anomaly: InsightAnomaly }) {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-orange-500/10 text-orange-400 border-orange-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{anomaly.description}</p>
      <div className="flex flex-wrap gap-2">
        <Badge className={cn("text-xs capitalize", getSeverityStyles(anomaly.severity))}>{anomaly.severity}</Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {anomaly.integration}
        </Badge>
      </div>
      {anomaly.historical && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Avg: <span className="font-semibold text-foreground">{anomaly.historical.mean.toFixed(1)}</span>
          </span>
          <ArrowRight className="h-3 w-3" />
          <span>
            Now: <span className="font-semibold text-foreground">{anomaly.historical.current}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Recommendation Insight Display
 */
function RecommendationInsight({ recommendation }: { recommendation: InsightRecommendation }) {
  const getPriorityStyles = (priority: number) => {
    if (priority >= 4) return { emoji: "🔥", color: "text-red-400", bg: "bg-red-500/10" };
    if (priority >= 3) return { emoji: "⚡", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { emoji: "💡", color: "text-blue-400", bg: "bg-blue-500/10" };
  };

  const priorityStyles = getPriorityStyles(recommendation.priority);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className={cn("text-lg p-1 rounded-lg", priorityStyles.bg)}>{priorityStyles.emoji}</span>
        <p className="font-semibold text-foreground flex-1 leading-tight">{recommendation.action}</p>
      </div>
      <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
      <Badge variant="secondary" className="text-xs capitalize bg-amber-500/10 text-amber-400 border-amber-500/20">
        {recommendation.category}
      </Badge>
    </div>
  );
}
