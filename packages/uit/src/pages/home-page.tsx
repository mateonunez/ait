import { DiscoveryStats } from "@/components/discovery/discovery-stats";
import { GoalTrackerWidget } from "@/components/discovery/goal-tracker-widget";
import { FloatingPromptButton } from "@/components/home/floating-prompt-button";
import { HomeFeed } from "@/components/home/home-feed";
import { IntegrationsList } from "@/components/integrations-list";
import { useChatDialog } from "@/contexts/chat.context";
import { InsightsProvider } from "@/contexts/insights.context";
import { useHomepageData } from "@/hooks/useHomepageData";
import { cn } from "@/styles/utils";
import type { HomeSection as HomeSectionType } from "@/types/integrations.types";
import { motion } from "framer-motion";
import { useState } from "react";

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
    entityTypes: [
      "commit",
      "tweet",
      "issue",
      "message",
      "recently_played",
      "pull_request",
      "page",
      "repository",
      "event",
    ],
    variant: "bento",
  },
  {
    id: "music",
    title: "Your Music",
    entityTypes: ["track", "playlist", "album", "recently_played"],
    variant: "scroll",
  },
  {
    id: "code",
    title: "Code & Projects",
    entityTypes: ["commit", "pull_request", "repository"],
    variant: "scroll",
  },
  {
    id: "tweets",
    title: "From Twitter",
    entityTypes: ["tweet"],
    variant: "grid",
  },
  {
    id: "workspace",
    title: "Your Workspace",
    entityTypes: ["page"],
    variant: "grid",
  },
  {
    id: "team",
    title: "Team Updates",
    entityTypes: ["message"],
    variant: "grid",
  },
  {
    id: "tasks",
    title: "Tasks & Issues",
    entityTypes: ["issue"],
    variant: "grid",
  },
  {
    id: "schedule",
    title: "Your Schedule",
    entityTypes: ["event"],
    variant: "scroll",
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
      <motion.div {...animationVariants} className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
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

          <div className="container mx-auto max-w-7xl my-8">
            <IntegrationsList />
          </div>

          <div className={cn("flex-1 overflow-y-auto custom-scrollbar", !isOpen && "pb-24 sm:pb-28")}>
            <HomeFeed
              isLoading={isLoading}
              sections={HOME_SECTIONS}
              sectionsData={sectionsData}
              totalItems={totalItems}
            />

            <div className="container mx-auto max-w-7xl my-8">
              <GoalTrackerWidget />
            </div>
          </div>
        </div>

        <FloatingPromptButton isOpen={isOpen} onClick={handlePromptClick} onSubmit={handlePromptSubmit} />
      </motion.div>
    </InsightsProvider>
  );
}
