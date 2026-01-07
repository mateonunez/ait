import { useStats } from "@/contexts/stats.context";
import { cn } from "@/styles/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { CacheTab } from "./tabs/cache-tab";
import { CostTab } from "./tabs/cost-tab";
import { ErrorsTab } from "./tabs/errors-tab";
import { OverviewTab } from "./tabs/overview-tab";
import { PerformanceTab } from "./tabs/performance-tab";
import { QualityTab } from "./tabs/quality-tab";
import { SystemTab } from "./tabs/system-tab";

type TabId = "overview" | "performance" | "cache" | "cost" | "errors" | "quality" | "system";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "cache", label: "Cache" },
  { id: "cost", label: "Cost" },
  { id: "errors", label: "Errors" },
  { id: "quality", label: "Quality" },
  { id: "system", label: "System" },
];

export function StatsContent() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { isLoading, lastUpdated, refreshStats, autoRefresh, setAutoRefresh } = useStats();

  // Fetch stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Format last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return "Never";
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
      case "performance":
        return <PerformanceTab />;
      case "cache":
        return <CacheTab />;
      case "cost":
        return <CostTab />;
      case "errors":
        return <ErrorsTab />;
      case "quality":
        return <QualityTab />;
      case "system":
        return <SystemTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <h2 className="text-xs sm:text-sm font-semibold truncate">Metrics</h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Auto-refresh toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors flex-shrink-0",
              autoRefresh
                ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            <RefreshCw className={cn("h-3 w-3", isLoading && autoRefresh && "animate-spin")} />
            <span className="hidden sm:inline">Auto</span>
          </button>

          {/* Last updated */}
          <div className="text-[10px] text-muted-foreground flex-shrink-0">
            Last: <span className="font-mono">{getLastUpdatedText()}</span>
          </div>

          {/* Manual refresh */}
          <button
            type="button"
            onClick={refreshStats}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
            title="Refresh now"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 sm:px-4 md:px-6 py-2 border-b border-border/50 bg-muted/30 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded transition-colors whitespace-nowrap flex-shrink-0",
              activeTab === tab.id
                ? "text-foreground bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-background shadow-sm rounded -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 custom-scrollbar min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
