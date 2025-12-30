/**
 * Insights Types
 *
 * Re-export backend types from @ait/ai-sdk for easier frontend usage
 */

import type { GoalPeriod, GoalType } from "@ait/core";

// Re-export all insight types from core
export type {
  InsightsData,
  InsightSummary,
  InsightCorrelation,
  InsightAnomaly,
  InsightRecommendation,
  Insight,
  InsightType,
  GoalData,
  GoalType,
  GoalPeriod,
  CreateGoalRequest,
  UpdateGoalRequest,
  ActivityData,
  InsightsConfig,
} from "@ait/core";

/**
 * Frontend-specific UI state types
 */

export interface InsightsUIState {
  isExpanded: boolean;
  selectedInsightType: "all" | "correlations" | "anomalies" | "recommendations";
  goalFormOpen: boolean;
  editingGoalId?: string;
}

export interface InsightCardProps {
  type: "correlation" | "anomaly" | "recommendation";
  title: string;
  description: string;
  icon?: string;
  priority?: number;
  severity?: "low" | "medium" | "high";
}

export interface GoalFormData {
  type: GoalType;
  target: number;
  period: GoalPeriod;
  label?: string;
  icon?: string;
}

export interface InsightsFilters {
  timeRange: "week" | "month" | "year";
  integrations: string[];
  minConfidence?: number;
  showOnlyHighPriority?: boolean;
}
