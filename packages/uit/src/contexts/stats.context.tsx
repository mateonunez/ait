import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { fetchAllMetrics } from "@/utils/stats-api.utils";
import type {
  HealthData,
  PerformanceData,
  CacheData,
  CostData,
  ErrorData,
  QualityData,
  FeedbackData,
  SystemData,
} from "@ait/core";

interface StatsContextType {
  health: HealthData | null;
  performance: PerformanceData | null;
  cache: CacheData | null;
  cost: CostData | null;
  errors: ErrorData | null;
  quality: QualityData | null;
  feedback: FeedbackData | null;
  system: SystemData | null;
  isLoading: boolean;
  lastUpdated: Date | null;
  refreshStats: () => Promise<void>;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  windowMinutes: number;
  setWindowMinutes: (minutes: number) => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [cache, setCache] = useState<CacheData | null>(null);
  const [cost, setCost] = useState<CostData | null>(null);
  const [errors, setErrors] = useState<ErrorData | null>(null);
  const [quality, setQuality] = useState<QualityData | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [system, setSystem] = useState<SystemData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [windowMinutes, setWindowMinutes] = useState(60);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllMetrics(windowMinutes);

      // Update all state from unified response
      setHealth(data.health);
      setPerformance(data.performance);
      setCache(data.cache);
      setCost(data.cost);
      setErrors(data.errors);
      setQuality(data.quality);
      setFeedback(data.feedback);
      setSystem(data.system);

      setLastUpdated(new Date());

      // Log any fetch errors
      const errorKeys = Object.keys(data.fetchErrors || {}).filter(
        (key) => data.fetchErrors?.[key as keyof typeof data.fetchErrors],
      );
      if (errorKeys.length > 0) {
        console.warn("[Stats] Some metrics failed to load:", errorKeys);
      } else {
        console.log("[Stats] All metrics refreshed successfully");
      }
    } catch (error) {
      console.error("[Stats] Failed to refresh metrics:", error);
      // Reset all metrics on critical error
      setHealth(null);
      setPerformance(null);
      setCache(null);
      setCost(null);
      setErrors(null);
      setQuality(null);
      setFeedback(null);
      setSystem(null);
    } finally {
      setIsLoading(false);
    }
  }, [windowMinutes]);

  // Auto-refresh every 15 seconds when enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshStats();
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, refreshStats]);

  return (
    <StatsContext.Provider
      value={{
        health,
        performance,
        cache,
        cost,
        errors,
        quality,
        feedback,
        system,
        isLoading,
        lastUpdated,
        refreshStats,
        autoRefresh,
        setAutoRefresh,
        windowMinutes,
        setWindowMinutes,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error("useStats must be used within a StatsProvider");
  }
  return context;
}
