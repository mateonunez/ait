import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/styles/utils";
import { RefreshCw, Activity } from "lucide-react";
import { useStats } from "@/contexts/stats.context";
import { motion, AnimatePresence } from "framer-motion";
import { OverviewTab } from "./tabs/overview-tab";
import { PerformanceTab } from "./tabs/performance-tab";
import { CacheTab } from "./tabs/cache-tab";
import { CostTab } from "./tabs/cost-tab";
import { ErrorsTab } from "./tabs/errors-tab";
import { QualityTab } from "./tabs/quality-tab";
import { SystemTab } from "./tabs/system-tab";

interface StatsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function StatsDashboard({ isOpen, onClose }: StatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { isLoading, lastUpdated, refreshStats, autoRefresh, setAutoRefresh } = useStats();

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Stats Dashboard</h2>
            <span className="text-[10px] text-muted-foreground ml-2">Press ESC to close</span>
          </div>

          <div className="flex items-center gap-3 mr-4">
            {/* Auto-refresh toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                autoRefresh
                  ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && autoRefresh && "animate-spin")} />
              Auto
            </button>

            {/* Last updated */}
            <div className="text-[10px] text-muted-foreground">
              Last: <span className="font-mono">{getLastUpdatedText()}</span>
            </div>

            {/* Manual refresh */}
            <button
              type="button"
              onClick={refreshStats}
              disabled={isLoading}
              className="p-1.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-muted-foreground", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-6 py-2 border-b border-border/50 bg-muted/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-3 py-1.5 text-xs font-medium rounded transition-colors",
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
        <div className="overflow-y-auto p-6 custom-scrollbar">
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
      </DialogContent>
    </Dialog>
  );
}
