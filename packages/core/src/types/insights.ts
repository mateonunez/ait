import { z } from "zod";

export type InsightType = "summary" | "correlation" | "anomaly" | "recommendation";
export interface InsightSummary {
  type: "summary";
  title: string;
  description: string;
  sentiment: "positive" | "neutral" | "negative";
  emoji: string;
  highlights: string[];
}

export const InsightSummarySchema = z.object({
  type: z.literal("summary"),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  emoji: z.string().min(1).max(10),
  highlights: z.array(z.string()).min(0).max(5),
});

export interface InsightCorrelation {
  type: "correlation";
  integrations: string[];
  pattern: string;
  strength: number; // 0-100
  description: string;
  example?: string;
  confidence: number; // 0-1
}

export const InsightCorrelationSchema = z.object({
  type: z.literal("correlation"),
  integrations: z.array(z.string()).min(2),
  pattern: z.string(),
  strength: z.number().min(0).max(100),
  description: z.string(),
  example: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export interface InsightAnomaly {
  type: "anomaly";
  integration: string;
  metric: string;
  deviation: number; // Standard deviations from mean
  description: string;
  severity: "low" | "medium" | "high";
  direction: "spike" | "drop";
  historical: {
    mean: number;
    stdDev: number;
    current: number;
  };
}

export const InsightAnomalySchema = z.object({
  type: z.literal("anomaly"),
  integration: z.string(),
  metric: z.string(),
  deviation: z.number(),
  description: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  direction: z.enum(["spike", "drop"]),
  historical: z.object({
    mean: z.number(),
    stdDev: z.number(),
    current: z.number(),
  }),
});

export interface InsightRecommendation {
  type: "recommendation";
  category: string;
  action: string;
  reason: string;
  priority: number; // 1-5, 5 being highest
  icon?: string;
}

export const InsightRecommendationSchema = z.object({
  type: z.literal("recommendation"),
  category: z.string(),
  action: z.string(),
  reason: z.string(),
  priority: z.number().min(1).max(5),
  icon: z.string().optional(),
});

export type Insight = InsightSummary | InsightCorrelation | InsightAnomaly | InsightRecommendation;

export interface InsightsData {
  timestamp: string;
  range: "week" | "month" | "year";
  summary: InsightSummary | null;
  correlations: InsightCorrelation[];
  anomalies: InsightAnomaly[];
  recommendations: InsightRecommendation[];
  meta: {
    generationTimeMs: number;
    dataPoints: number;
    cacheHit: boolean;
  };
}

export interface InsightsConfig {
  enableSummary?: boolean;
  enableCorrelations?: boolean;
  enableAnomalies?: boolean;
  enableRecommendations?: boolean;
  anomalyThreshold?: number; // Standard deviations (default: 2)
  correlationMinStrength?: number; // Minimum correlation coefficient (default: 0.5)
  maxCorrelations?: number; // Max correlations to return (default: 3)
  maxAnomalies?: number; // Max anomalies to return (default: 5)
  maxRecommendations?: number; // Max recommendations to return (default: 3)
  cacheEnabled?: boolean;
  cacheTtlSeconds?: number;
}

export const DEFAULT_INSIGHTS_CONFIG: Required<InsightsConfig> = {
  enableSummary: true,
  enableCorrelations: true,
  enableAnomalies: true,
  enableRecommendations: true,
  anomalyThreshold: 2,
  correlationMinStrength: 0.5,
  maxCorrelations: 3,
  maxAnomalies: 5,
  maxRecommendations: 3,
  cacheEnabled: true,
  cacheTtlSeconds: 3600, // 1 hour
};
