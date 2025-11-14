import { cn } from "@/styles/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface IntegrationTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function IntegrationTabs({ tabs, activeTab, onTabChange, className }: IntegrationTabsProps) {
  return (
    <div className={cn("border-b border-border overflow-x-auto", className)}>
      <nav className="flex gap-2 sm:gap-4 px-3 sm:px-4 min-w-max sm:min-w-0" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative px-2 sm:px-3 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
              "hover:text-foreground focus:outline-none",
              activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
            )}
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium",
                    activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
