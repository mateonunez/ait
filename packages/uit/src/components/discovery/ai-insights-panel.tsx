import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, RefreshCw, AlertCircle, ChevronUp } from "lucide-react";
import { useInsights } from "@/contexts/insights.context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-background to-background">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-background">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Failed to Load Insights</CardTitle>
          </div>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refreshInsights} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No insights yet
  if (!insights) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <CardTitle>AI Insights</CardTitle>
          </div>
          <CardDescription>Loading your personalized insights...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { summary, correlations, anomalies, recommendations, meta } = insights;

  // Get sentiment styling
  const getSentimentStyles = (sentiment: "positive" | "neutral" | "negative") => {
    switch (sentiment) {
      case "positive":
        return "border-green-500/20 bg-gradient-to-br from-green-500/5 via-background to-background";
      case "negative":
        return "border-red-500/20 bg-gradient-to-br from-red-500/5 via-background to-background";
      default:
        return "border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background";
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

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={timeRange}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn(getSentimentStyles(summary?.sentiment || "neutral"))}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>{getTimeRangeLabel()}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {meta && (
                  <Badge variant="secondary" className="text-xs">
                    {meta.cacheHit ? "Cached" : `${meta.generationTimeMs}ms`}
                  </Badge>
                )}
                {onHide && (
                  <Button variant="ghost" size="icon" onClick={onHide} className="h-8 w-8">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* AI Summary */}
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-start gap-3">
                  <span className="text-4xl">{summary.emoji}</span>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-lg">{summary.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{summary.description}</p>

                    {/* Highlights */}
                    {summary.highlights && summary.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {summary.highlights.map((highlight) => (
                          <Badge key={highlight} variant="outline" className="text-xs">
                            {highlight}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Insights Sections */}
            {(correlations.length > 0 || anomalies.length > 0 || recommendations.length > 0) && (
              <div className="space-y-6 pt-4">
                {/* Recommendations Section - Show all */}
                {recommendations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-purple-500" />
                      <h4 className="font-semibold text-base">Suggestions</h4>
                      <Badge variant="secondary" className="text-xs">
                        {recommendations.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.map((rec, idx) => (
                        <InsightCard
                          key={`rec-${rec.category}-${rec.action}-${idx}`}
                          icon={Lightbulb}
                          title={`Suggestion ${idx + 1}`}
                          iconColor="text-purple-500"
                          bgColor="bg-purple-500/10"
                          delay={0.1 + idx * 0.05}
                        >
                          <RecommendationInsight recommendation={rec} />
                        </InsightCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* Correlations Section - Show all */}
                {correlations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <h4 className="font-semibold text-base">Patterns Detected</h4>
                      <Badge variant="secondary" className="text-xs">
                        {correlations.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {correlations.map((corr, idx) => (
                        <InsightCard
                          key={`corr-${corr.integrations.join("-")}-${corr.strength}-${idx}`}
                          icon={TrendingUp}
                          title={`Pattern ${idx + 1}`}
                          iconColor="text-blue-500"
                          bgColor="bg-blue-500/10"
                          delay={0.2 + idx * 0.05}
                        >
                          <CorrelationInsight correlation={corr} />
                        </InsightCard>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomalies Section - Show all */}
                {anomalies.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <h4 className="font-semibold text-base">Activity Alerts</h4>
                      <Badge variant="secondary" className="text-xs">
                        {anomalies.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {anomalies.map((anom, idx) => (
                        <InsightCard
                          key={`anom-${anom.integration}-${anom.metric}-${idx}`}
                          icon={AlertTriangle}
                          title={`Alert ${idx + 1}`}
                          iconColor="text-orange-500"
                          bgColor="bg-orange-500/10"
                          delay={0.3 + idx * 0.05}
                        >
                          <AnomalyInsight anomaly={anom} />
                        </InsightCard>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!summary && correlations.length === 0 && anomalies.length === 0 && recommendations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Not enough activity data to generate insights yet.</p>
                <p className="text-sm mt-2">Keep using your integrations to unlock AI-powered insights!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Insight Card Component
 */
interface InsightCardProps {
  icon: React.ElementType;
  title: string;
  iconColor: string;
  bgColor: string;
  delay: number;
  children: React.ReactNode;
}

function InsightCard({ icon: Icon, title, iconColor, bgColor, delay, children }: InsightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <div className={cn("p-2 rounded-lg", bgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <h4 className="font-medium text-sm">{title}</h4>
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </motion.div>
  );
}

/**
 * Correlation Insight Display
 */
function CorrelationInsight({
  correlation,
}: {
  correlation: InsightCorrelation;
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground">{correlation.pattern}</p>
      <p>{correlation.description}</p>
      {correlation.example && (
        <p className="text-xs italic border-l-2 border-primary/50 pl-2 mt-2">{correlation.example}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="secondary" className="text-xs">
          {correlation.strength}% correlation
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
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-2">
      <p>{anomaly.description}</p>
      <div className="flex flex-wrap gap-2 mt-2">
        <Badge variant={getSeverityColor(anomaly.severity)} className="text-xs capitalize">
          {anomaly.severity} severity
        </Badge>
        <Badge variant="outline" className="text-xs capitalize">
          {anomaly.integration}
        </Badge>
      </div>
      {anomaly.historical && (
        <p className="text-xs mt-2">
          Avg: {anomaly.historical.mean.toFixed(1)} | Current: {anomaly.historical.current}
        </p>
      )}
    </div>
  );
}

/**
 * Recommendation Insight Display
 */
function RecommendationInsight({
  recommendation,
}: {
  recommendation: InsightRecommendation;
}) {
  const getPriorityIndicator = (priority: number) => {
    if (priority >= 4) return "🔥";
    if (priority >= 3) return "⚡";
    return "💡";
  };

  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground flex items-center gap-2">
        <span>{getPriorityIndicator(recommendation.priority)}</span>
        <span>{recommendation.action}</span>
      </p>
      <p>{recommendation.reason}</p>
      <Badge variant="secondary" className="text-xs capitalize mt-2">
        {recommendation.category}
      </Badge>
    </div>
  );
}
