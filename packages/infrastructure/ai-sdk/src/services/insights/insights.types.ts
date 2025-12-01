import type { EntityType } from "@ait/core";
import { z } from "zod";

/**
 * Insight Types
 */
export type InsightType = "summary" | "correlation" | "anomaly" | "recommendation";

/**
 * Summary Insight - AI-generated narrative summary
 */
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

/**
 * Correlation Insight - Cross-integration patterns
 */
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

/**
 * Anomaly Insight - Unusual patterns or deviations
 */
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

/**
 * Recommendation Insight - Actionable suggestions
 */
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

/**
 * Combined Insight type
 */
export type Insight = InsightSummary | InsightCorrelation | InsightAnomaly | InsightRecommendation;

/**
 * Complete Insights Response
 */
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

/**
 * Goal Tracking Types
 */

/**
 * GoalType uses EntityType from core, plus backward compatibility aliases
 * - "songs" -> "recently_played" (backward compatibility)
 * - "tweets" -> "tweet" (backward compatibility)
 * - "commits" -> "commit" (backward compatibility)
 * - "tasks" -> "issue" (backward compatibility)
 * - "documents" -> "page" (backward compatibility)
 */
export type GoalType =
  | EntityType
  | "songs" // Alias for "recently_played" (backward compatibility)
  | "tweets" // Alias for "tweet" (backward compatibility)
  | "commits" // Alias for "commit" (backward compatibility)
  | "tasks" // Alias for "issue" (backward compatibility)
  | "documents" // Alias for "page" (backward compatibility)
  | "messages" // Alias for "message" (backward compatibility)
  | "meetings"; // Alias for "event" (backward compatibility)

export type GoalPeriod = "daily" | "weekly" | "monthly";

export interface GoalData {
  id: string;
  type: GoalType;
  target: number;
  period: GoalPeriod;
  current: number;
  progress: number; // 0-100
  streak: number;
  createdAt: string;
  updatedAt: string;
  label?: string;
  icon?: string;
}

export const CreateGoalSchema = z.object({
  type: z.enum([
    // EntityType values from core
    "track",
    "artist",
    "playlist",
    "album",
    "recently_played",
    "repository",
    "pull_request",
    "commit",
    "issue",
    "tweet",
    "page",
    "message",
    "event",
    "calendar",
    "subscription",
    // Backward compatibility aliases
    "songs", // -> "recently_played"
    "tweets", // -> "tweet"
    "commits", // -> "commit"
    "tasks", // -> "issue"
    "documents", // -> "page"
    "messages", // -> message
    "meetings", // -> event
  ]),
  target: z.number().min(1),
  period: z.enum(["daily", "weekly", "monthly"]),
  label: z.string().optional(),
  icon: z.string().optional(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalSchema>;

export const UpdateGoalSchema = z.object({
  target: z.number().min(1).optional(),
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
  label: z.string().optional(),
  icon: z.string().optional(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalSchema>;

/**
 * Integration Activity - Activity data for a single integration
 */
export interface IntegrationActivity {
  total: number;
  daily: Array<{ date: string; count: number }>;
}

/**
 * Activity Data for Insights Generation
 *
 * Supports both legacy fixed structure (for backward compatibility) and dynamic Record structure.
 * The dynamic structure allows any connector type as a key.
 */
export interface ActivityData extends Record<string, IntegrationActivity | undefined> {
  // Legacy fields for backward compatibility (optional to allow dynamic structure)
  spotify?: IntegrationActivity;
  x?: IntegrationActivity;
  slack?: IntegrationActivity;
  github?: IntegrationActivity;
  linear?: IntegrationActivity;
  notion?: IntegrationActivity;
  google?: IntegrationActivity;
}

/**
 * Configuration for insights generation
 */
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
