import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { InsightsData, GoalData, CreateGoalRequest, UpdateGoalRequest } from "@ait/ai-sdk";
import {
  fetchInsights,
  fetchGoals,
  createGoal as apiCreateGoal,
  updateGoal as apiUpdateGoal,
  deleteGoal as apiDeleteGoal,
} from "@/utils/insights-api.utils";

interface InsightsContextType {
  insights: InsightsData | null;
  goals: GoalData[];
  isLoading: boolean;
  isLoadingGoals: boolean;
  error: string | null;
  timeRange: "week" | "month" | "year";
  setTimeRange: (range: "week" | "month" | "year") => void;
  refreshInsights: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  createGoal: (goal: CreateGoalRequest) => Promise<void>;
  updateGoal: (id: string, updates: UpdateGoalRequest) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

interface InsightsProviderProps {
  children: ReactNode;
  initialTimeRange?: "week" | "month" | "year";
}

export function InsightsProvider({ children, initialTimeRange = "week" }: InsightsProviderProps) {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGoals, setIsLoadingGoals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">(initialTimeRange);

  /**
   * Refresh insights from API
   */
  const refreshInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[Insights] Fetching insights for ${timeRange}...`);
      const data = await fetchInsights(timeRange);
      setInsights(data);
      console.log("[Insights] Successfully fetched insights");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch insights";
      console.error("[Insights] Error:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  /**
   * Refresh goals from API
   */
  const refreshGoals = useCallback(async () => {
    setIsLoadingGoals(true);

    try {
      console.log("[Insights] Fetching goals...");
      const data = await fetchGoals();
      setGoals(data);
      console.log(`[Insights] Successfully fetched ${data.length} goals`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch goals";
      console.error("[Insights] Error fetching goals:", errorMessage);
      // Don't set error state for goals, just log it
    } finally {
      setIsLoadingGoals(false);
    }
  }, []);

  /**
   * Create a new goal
   */
  const createGoal = useCallback(async (goal: CreateGoalRequest) => {
    try {
      console.log("[Insights] Creating goal:", goal);
      const newGoal = await apiCreateGoal(goal);
      setGoals((prev) => [...prev, newGoal]);
      console.log("[Insights] Goal created successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create goal";
      console.error("[Insights] Error creating goal:", errorMessage);
      throw err;
    }
  }, []);

  /**
   * Update an existing goal
   */
  const updateGoal = useCallback(async (id: string, updates: UpdateGoalRequest) => {
    try {
      console.log("[Insights] Updating goal:", id, updates);
      const updatedGoal = await apiUpdateGoal(id, updates);
      setGoals((prev) => prev.map((g) => (g.id === id ? updatedGoal : g)));
      console.log("[Insights] Goal updated successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update goal";
      console.error("[Insights] Error updating goal:", errorMessage);
      throw err;
    }
  }, []);

  /**
   * Delete a goal
   */
  const deleteGoal = useCallback(async (id: string) => {
    try {
      console.log("[Insights] Deleting goal:", id);
      await apiDeleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      console.log("[Insights] Goal deleted successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete goal";
      console.error("[Insights] Error deleting goal:", errorMessage);
      throw err;
    }
  }, []);

  /**
   * Auto-refresh insights when time range changes
   */
  useEffect(() => {
    refreshInsights();
  }, [refreshInsights]);

  /**
   * Load goals on mount
   */
  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  return (
    <InsightsContext.Provider
      value={{
        insights,
        goals,
        isLoading,
        isLoadingGoals,
        error,
        timeRange,
        setTimeRange,
        refreshInsights,
        refreshGoals,
        createGoal,
        updateGoal,
        deleteGoal,
      }}
    >
      {children}
    </InsightsContext.Provider>
  );
}

/**
 * Hook to use insights context
 */
export function useInsights() {
  const context = useContext(InsightsContext);
  if (context === undefined) {
    throw new Error("useInsights must be used within an InsightsProvider");
  }
  return context;
}
