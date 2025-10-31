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
} from "@/types/stats.types";

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [windowMinutes, setWindowMinutes] = useState(60);

  const refreshStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllMetrics(windowMinutes);

      if (data.health) setHealth(data.health);
      if (data.performance) setPerformance(data.performance);
      if (data.cache) setCache(data.cache);
      if (data.cost) setCost(data.cost);
      if (data.errors) setErrors(data.errors);
      if (data.quality) setQuality(data.quality);
      if (data.feedback) setFeedback(data.feedback);
      if (data.system) setSystem(data.system);

      setLastUpdated(new Date());
      console.log("[Stats] Refreshed all metrics");
    } catch (error) {
      console.error("[Stats] Failed to refresh metrics:", error);
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

  // Initial load
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

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
