import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIChatButton } from "@/components/ai-chat-button";
import { GoalsButton } from "@/components/goals-button";
import { IntegrationsList } from "@/components/integrations-list";
import { useHomepageData } from "@/hooks/useHomepageData";
import { useChatDialog } from "@/contexts/chat.context";
import type { HomeSection as HomeSectionType } from "@/types/integrations.types";
import { DiscoveryStats } from "@/components/discovery/discovery-stats";
import { GoalTrackerWidget } from "@/components/discovery/goal-tracker-widget";
import { InsightsProvider } from "@/contexts/insights.context";
import { cn } from "@/styles/utils";
import { useState } from "react";
import { FloatingPromptButton } from "@/components/home/floating-prompt-button";
import { HomeFeed } from "@/components/home/home-feed";

const animationVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

// Homepage sections configuration
const HOME_SECTIONS: HomeSectionType[] = [
  {
    id: "recent",
    title: "Recent Activity",
    entityTypes: ["commit", "tweet", "issue", "message", "recently_played", "pull_request", "page", "repository"],
  },
  {
    id: "music",
    title: "Your Music",
    entityTypes: ["track", "playlist", "album", "recently_played"],
  },
  {
    id: "code",
    title: "Code & Projects",
    entityTypes: ["commit", "pull_request", "repository"],
  },
  {
    id: "tweets",
    title: "From Twitter",
    entityTypes: ["tweet"],
  },
  {
    id: "workspace",
    title: "Your Workspace",
    entityTypes: ["page"],
  },
  {
    id: "team",
    title: "Team Updates",
    entityTypes: ["message"],
  },
  {
    id: "tasks",
    title: "Tasks & Issues",
    entityTypes: ["issue"],
  },
];

export default function HomePage() {
  const { sectionsData, isLoading, totalItems } = useHomepageData({
    sections: HOME_SECTIONS,
  });
  const { isOpen, openChat } = useChatDialog();
  const [timeRange] = useState<"week" | "month" | "year">("week");

  const handlePromptClick = () => {
    openChat();
  };

  const handlePromptSubmit = () => {
    openChat();
  };

  return (
    <InsightsProvider initialTimeRange={timeRange}>
      <div className="min-h-dvh flex flex-col bg-background">
        {/* Header - Fixed with subtle backdrop */}
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">AIt</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Your AI-powered integration hub</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GoalsButton />
              <AIChatButton />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <motion.main {...animationVariants} className="flex-1 flex flex-col overflow-hidden">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
            <div className="container mx-auto max-w-7xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Loading your content...
                  </span>
                ) : totalItems > 0 ? (
                  `Discover ${totalItems} ${totalItems === 1 ? "item" : "items"} from your integrations`
                ) : (
                  "Connect your integrations to see your content"
                )}
              </p>
            </div>

            <div className="container mx-auto max-w-7xl my-8">
              <DiscoveryStats />
            </div>

            <div className={cn("flex-1 overflow-y-auto custom-scrollbar", !isOpen && "pb-24 sm:pb-28")}>
              <HomeFeed
                isLoading={isLoading}
                sections={HOME_SECTIONS}
                sectionsData={sectionsData}
                totalItems={totalItems}
              />

              <div className="container mx-auto max-w-7xl my-8">
                <IntegrationsList />
              </div>

              <div className="container mx-auto max-w-7xl my-8">
                <GoalTrackerWidget />
              </div>
            </div>
          </div>

          <FloatingPromptButton isOpen={isOpen} onClick={handlePromptClick} onSubmit={handlePromptSubmit} />
        </motion.main>
      </div>
    </InsightsProvider>
  );
}
