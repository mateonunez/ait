import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights } from "@/contexts/insights.context";
import { cn } from "@/styles/utils";
import type { InsightAnomaly, InsightCorrelation, InsightRecommendation } from "@ait/ai-sdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  ChevronUp,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useEffect } from "react";

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
    return <LoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={refreshInsights} />;
  }

  // No insights yet
  if (!insights) {
    return <EmptyState />;
  }

  const { summary, correlations, anomalies, recommendations, meta } = insights;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={timeRange}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl border backdrop-blur-sm"
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={cn(
              "absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-50",
              "bg-gradient-to-bl from-violet-500/20 to-transparent",
            )}
          />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <Card className="border-0 overflow-hidden">
          <CardHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4" role="banner">
                <motion.div
                  className="relative shrink-0"
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.5 }}
                  aria-hidden="true"
                >
                  <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-xl" />
                  <div className="relative p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30">
                    <Brain className="h-6 w-6 text-violet-400" />
                  </div>
                </motion.div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    {getTimeRangeLabel(timeRange)}
                    <Sparkles className="h-4 w-4 text-violet-400" aria-hidden="true" />
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">AI-generated insights from your activity</p>
                </div>
              </div>
              <div className="flex items-center gap-2" role="toolbar">
                {meta && (
                  <Badge variant="secondary" className="text-xs bg-background/50 backdrop-blur-sm">
                    <Zap className="h-3 w-3 mr-1 text-yellow-500" aria-hidden="true" />
                    {meta.cacheHit ? "Cached" : `${meta.generationTimeMs}ms`}
                  </Badge>
                )}
                {onHide && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onHide}
                    className="h-8 w-8 rounded-lg"
                    aria-label="Hide insights panel"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 space-y-6">
            {/* AI Summary - Hero Section */}
            {summary && <SummarySection summary={summary} />}

            {/* Insights Grid */}
            {(correlations.length > 0 || anomalies.length > 0 || recommendations.length > 0) && (
              <div className="space-y-6">
                {/* Recommendations Section */}
                {recommendations.length > 0 && <RecommendationsSection recommendations={recommendations} />}

                {/* Correlations Section */}
                {correlations.length > 0 && <CorrelationsSection correlations={correlations} />}

                {/* Anomalies Section */}
                {anomalies.length > 0 && <AnomaliesSection anomalies={anomalies} />}
              </div>
            )}

            {/* Empty state */}
            {!summary && correlations.length === 0 && anomalies.length === 0 && recommendations.length === 0 && (
              <EmptyInsightsState />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

function getTimeRangeLabel(timeRange: "week" | "month" | "year"): string {
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
}

function LoadingState() {
  return (
    <Card className="relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-background backdrop-blur-sm">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-3" aria-label="Loading AI insights">
          <div className="relative shrink-0">
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
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 via-background to-background">
      <CardContent className="p-6">
        <div className="flex items-center gap-4" role="alert">
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0">
            <AlertCircle className="h-6 w-6 text-red-400" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Failed to Load Insights</CardTitle>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={onRetry} variant="outline" size="sm" className="gap-2 shrink-0">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-border/50 bg-muted/30 backdrop-blur-sm">
      <CardContent className="p-8 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-muted/50 mb-4 mx-auto" aria-hidden="true">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle className="mb-2">Loading Insights</CardTitle>
        <p className="text-sm text-muted-foreground">Analyzing your activity patterns...</p>
      </CardContent>
    </Card>
  );
}

interface SummarySectionProps {
  summary: {
    emoji: string;
    title: string;
    description: string;
    highlights?: string[];
  };
}

function SummarySection({ summary }: SummarySectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-xl bg-background/50 backdrop-blur-sm border border-border/50"
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4" aria-labelledby="summary-title">
          <motion.span
            className="text-5xl shrink-0 mt-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
            aria-hidden="true"
          >
            {summary.emoji}
          </motion.span>
          <div className="flex-1 space-y-3">
            <div>
              <h3 id="summary-title" className="font-bold text-xl mb-1">
                {summary.title}
              </h3>
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
      </CardContent>
    </motion.div>
  );
}

interface RecommendationsSectionProps {
  recommendations: InsightRecommendation[];
}

function RecommendationsSection({ recommendations }: RecommendationsSectionProps) {
  return (
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
          <InsightCard key={`rec-${rec.category}-${rec.action}-${idx}`} delay={0.25 + idx * 0.05} accentColor="amber">
            <RecommendationInsight recommendation={rec} />
          </InsightCard>
        ))}
      </div>
    </InsightSection>
  );
}

interface CorrelationsSectionProps {
  correlations: InsightCorrelation[];
}

function CorrelationsSection({ correlations }: CorrelationsSectionProps) {
  return (
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
  );
}

interface AnomaliesSectionProps {
  anomalies: InsightAnomaly[];
}

function AnomaliesSection({ anomalies }: AnomaliesSectionProps) {
  return (
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
  );
}

function EmptyInsightsState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
      <div className="inline-flex p-4 rounded-2xl bg-muted/50 mb-4 mx-auto" aria-hidden="true">
        <Target className="h-8 w-8 text-muted-foreground" />
      </div>
      <CardTitle className="mb-2">Not Enough Data</CardTitle>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Keep using your integrations to unlock AI-powered insights and personalized recommendations!
      </p>
    </motion.div>
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
      aria-labelledby={`section-${title.toLowerCase()}`}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", bgColor, borderColor, "border")}>
          <Icon className={cn("h-4 w-4", iconColor)} aria-hidden="true" />
        </div>
        <h4 id={`section-${title.toLowerCase()}`} className="font-semibold">
          {title}
        </h4>
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
      <Card className="border-0 bg-transparent shadow-none p-0 h-full">
        <CardContent className="p-0">{children}</CardContent>
      </Card>
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
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{anomaly.description}</p>
      <div className="flex flex-wrap gap-2">
        <Badge className={cn("text-xs capitalize border", getSeverityStyles(anomaly.severity))}>
          {anomaly.severity}
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {anomaly.integration}
        </Badge>
      </div>
      {anomaly.historical && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Avg:{" "}
            <span
              className="font-semibold text-foreground"
              aria-label={`${anomaly.historical.mean.toFixed(1)} average`}
            >
              {anomaly.historical.mean.toFixed(1)}
            </span>
          </span>
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
          <span>
            Now:{" "}
            <span className="font-semibold text-foreground" aria-label={`Current value ${anomaly.historical.current}`}>
              {anomaly.historical.current}
            </span>
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
        <span className={cn("text-lg p-1 rounded-lg shrink-0", priorityStyles.bg)} aria-hidden="true">
          {priorityStyles.emoji}
        </span>
        <p className="font-semibold text-foreground flex-1 leading-tight">{recommendation.action}</p>
      </div>
      <p className="text-sm text-muted-foreground">{recommendation.reason}</p>
      <Badge variant="secondary" className="text-xs capitalize bg-amber-500/10 text-amber-400 border-amber-500/20">
        {recommendation.category}
      </Badge>
    </div>
  );
}
