import type { InsightsData, GoalData, CreateGoalRequest, UpdateGoalRequest } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import { apiGet, apiPost, apiPatch, apiDelete } from "./http-client";

const logger = getLogger();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:3000/api";

/**
 * Fetch AI-generated insights for a time range
 */
export async function fetchInsights(range: "week" | "month" | "year" = "week"): Promise<InsightsData> {
  const res = await apiGet<InsightsData>(`${API_BASE_URL}/insights/summary?range=${range}`);
  if (!res.ok) {
    logger.error("[Insights API] Failed to fetch insights:", { error: res.error });
    throw new Error(res.error || "Failed to fetch insights");
  }
  return res.data as InsightsData;
}

/**
 * Fetch correlations for a time range
 */
export async function fetchCorrelations(
  range: "week" | "month" | "year" = "week",
): Promise<InsightsData["correlations"]> {
  const res = await apiGet<{ correlations: InsightsData["correlations"] }>(
    `${API_BASE_URL}/insights/correlations?range=${range}`,
  );
  if (!res.ok) {
    logger.error("[Insights API] Failed to fetch correlations:", { error: res.error });
    throw new Error(res.error || "Failed to fetch correlations");
  }
  return res.data?.correlations || [];
}

/**
 * Fetch anomalies for a time range
 */
export async function fetchAnomalies(range: "week" | "month" | "year" = "week"): Promise<InsightsData["anomalies"]> {
  const res = await apiGet<{ anomalies: InsightsData["anomalies"] }>(
    `${API_BASE_URL}/insights/anomalies?range=${range}`,
  );
  if (!res.ok) {
    logger.error("[Insights API] Failed to fetch anomalies:", { error: res.error });
    throw new Error(res.error || "Failed to fetch anomalies");
  }
  return res.data?.anomalies || [];
}

/**
 * Fetch recommendations for a time range
 */
export async function fetchRecommendations(
  range: "week" | "month" | "year" = "week",
): Promise<InsightsData["recommendations"]> {
  const res = await apiGet<{ recommendations: InsightsData["recommendations"] }>(
    `${API_BASE_URL}/insights/recommendations?range=${range}`,
  );
  if (!res.ok) {
    logger.error("[Insights API] Failed to fetch recommendations:", { error: res.error });
    throw new Error(res.error || "Failed to fetch recommendations");
  }
  return res.data?.recommendations || [];
}

/**
 * Fetch all goals
 */
export async function fetchGoals(): Promise<GoalData[]> {
  const res = await apiGet<GoalData[]>(`${API_BASE_URL}/insights/goals`);
  if (!res.ok) {
    logger.error("[Insights API] Failed to fetch goals:", { error: res.error });
    throw new Error(res.error || "Failed to fetch goals");
  }
  return res.data as GoalData[];
}

/**
 * Create a new goal
 */
export async function createGoal(goal: CreateGoalRequest): Promise<GoalData> {
  const res = await apiPost<GoalData>(`${API_BASE_URL}/insights/goals`, goal);
  if (!res.ok) {
    logger.error("[Insights API] Failed to create goal:", { error: res.error });
    throw new Error(res.error || "Failed to create goal");
  }
  return res.data as GoalData;
}

/**
 * Update an existing goal
 */
export async function updateGoal(id: string, updates: UpdateGoalRequest): Promise<GoalData> {
  const res = await apiPatch<GoalData>(`${API_BASE_URL}/insights/goals/${id}`, updates);
  if (!res.ok) {
    logger.error("[Insights API] Failed to update goal:", { error: res.error });
    throw new Error(res.error || "Failed to update goal");
  }
  return res.data as GoalData;
}

/**
 * Delete a goal
 */
export async function deleteGoal(id: string): Promise<void> {
  const res = await apiDelete(`${API_BASE_URL}/insights/goals/${id}`);
  if (!res.ok) {
    logger.error("[Insights API] Failed to delete goal:", { error: res.error });
    throw new Error(res.error || "Failed to delete goal");
  }
}
