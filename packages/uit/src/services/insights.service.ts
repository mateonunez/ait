import type { CreateGoalRequest, GoalData, InsightsData, UpdateGoalRequest } from "@ait/core";
import { getLogger } from "@ait/core";
import { apiConfig } from "../config/api.config";
import { apiDelete, apiGet, apiPatch, apiPost } from "../utils/http-client";

const logger = getLogger();

export async function fetchInsights(range: "week" | "month" | "year" = "week"): Promise<InsightsData> {
  const res = await apiGet<InsightsData>(`${apiConfig.apiBaseUrl}/insights/summary?range=${range}`);
  if (!res.ok) {
    logger.error("[InsightsService] Failed to fetch insights:", { error: res.error });
    throw new Error(res.error || "Failed to fetch insights");
  }
  return res.data as InsightsData;
}

export async function fetchCorrelations(
  range: "week" | "month" | "year" = "week",
): Promise<InsightsData["correlations"]> {
  const res = await apiGet<{ correlations: InsightsData["correlations"] }>(
    `${apiConfig.apiBaseUrl}/insights/correlations?range=${range}`,
  );
  if (!res.ok) {
    logger.error("[InsightsService] Failed to fetch correlations:", { error: res.error });
    throw new Error(res.error || "Failed to fetch correlations");
  }
  return res.data?.correlations || [];
}

export async function fetchAnomalies(range: "week" | "month" | "year" = "week"): Promise<InsightsData["anomalies"]> {
  const res = await apiGet<{ anomalies: InsightsData["anomalies"] }>(
    `${apiConfig.apiBaseUrl}/insights/anomalies?range=${range}`,
  );
  if (!res.ok) {
    logger.error("[InsightsService] Failed to fetch anomalies:", { error: res.error });
    throw new Error(res.error || "Failed to fetch anomalies");
  }
  return res.data?.anomalies || [];
}

export async function fetchRecommendations(
  range: "week" | "month" | "year" = "week",
): Promise<InsightsData["recommendations"]> {
  const res = await apiGet<{ recommendations: InsightsData["recommendations"] }>(
    `${apiConfig.apiBaseUrl}/insights/recommendations?range=${range}`,
  );
  if (!res.ok) {
    logger.error("[InsightsService] Failed to fetch recommendations:", { error: res.error });
    throw new Error(res.error || "Failed to fetch recommendations");
  }
  return res.data?.recommendations || [];
}

export async function fetchGoals(): Promise<GoalData[]> {
  const res = await apiGet<GoalData[]>(`${apiConfig.apiBaseUrl}/insights/goals`);
  if (!res.ok) {
    logger.error("[InsightsService] Failed to fetch goals:", { error: res.error });
    throw new Error(res.error || "Failed to fetch goals");
  }
  return res.data as GoalData[];
}

export async function createGoal(goal: CreateGoalRequest): Promise<GoalData> {
  const res = await apiPost<GoalData>(`${apiConfig.apiBaseUrl}/insights/goals`, goal);
  if (!res.ok) {
    logger.error("[InsightsService] Failed to create goal:", { error: res.error });
    throw new Error(res.error || "Failed to create goal");
  }
  return res.data as GoalData;
}

export async function updateGoal(id: string, updates: UpdateGoalRequest): Promise<GoalData> {
  const res = await apiPatch<GoalData>(`${apiConfig.apiBaseUrl}/insights/goals/${id}`, updates);
  if (!res.ok) {
    logger.error("[InsightsService] Failed to update goal:", { error: res.error });
    throw new Error(res.error || "Failed to update goal");
  }
  return res.data as GoalData;
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await apiDelete(`${apiConfig.apiBaseUrl}/insights/goals/${id}`);
  if (!res.ok) {
    logger.error("[InsightsService] Failed to delete goal:", { error: res.error });
    throw new Error(res.error || "Failed to delete goal");
  }
}
