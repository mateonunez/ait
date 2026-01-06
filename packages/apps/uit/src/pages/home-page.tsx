import { BackgroundEffects } from "@/components/background-effects";
import { DiscoveryStats } from "@/components/discovery/discovery-stats";
import { GoalTrackerWidget } from "@/components/discovery/goal-tracker-widget";
import { FloatingPromptButton } from "@/components/home/floating-prompt-button";
import { HomeFeed } from "@/components/home/home-feed";
import { IntegrationsList } from "@/components/integrations-list";
import { InsightsProvider } from "@/contexts/insights.context";
import { useHomepageData } from "@/hooks/useHomepageData";
import { cn } from "@/styles/utils";
import type { HomeSection as HomeSectionType } from "@/types/integrations.types";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";

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
      "x_tweet",
      "linear_issue",
      "spotify_recently_played",
      "github_pull_request",
      "google_calendar_event",
      "google_photo",
      "spotify_playlist",
    ],
    variant: "bento",
    viewAllHref: "/connections",
  },
  {
    id: "music",
    title: "Your Music",
    entityTypes: ["spotify_track", "spotify_playlist", "spotify_album", "spotify_recently_played"],
    variant: "scroll",
    viewAllHref: "/integrations/spotify",
  },
  {
    id: "code",
    title: "Code & Projects",
    entityTypes: ["github_commit", "github_pull_request", "github_repository"],
    variant: "scroll",
    viewAllHref: "/integrations/github",
  },
  {
    id: "tweets",
    title: "From Twitter",
    entityTypes: ["x_tweet"],
    variant: "grid",
    viewAllHref: "/integrations/x",
  },
  {
    id: "workspace",
    title: "Your Workspace",
    entityTypes: ["notion_page"],
    variant: "grid",
    viewAllHref: "/integrations/notion",
  },
  {
    id: "team",
    title: "Team Updates",
    entityTypes: ["slack_message"],
    variant: "grid",
    viewAllHref: "/integrations/slack",
  },
  {
    id: "tasks",
    title: "Tasks & Issues",
    entityTypes: ["linear_issue"],
    variant: "grid",
    viewAllHref: "/integrations/linear",
  },
  {
    id: "schedule",
    title: "Your Schedule",
    entityTypes: ["google_calendar_event"],
    variant: "scroll",
    viewAllHref: "/integrations/google",
  },
];

export default function HomePage() {
  const { sectionsData, isLoading, totalItems } = useHomepageData({
    sections: HOME_SECTIONS,
  });
  const [, setLocation] = useLocation();
  const [timeRange] = useState<"week" | "month" | "year">("week");

  const handlePromptClick = () => {
    setLocation("/chat");
  };

  const handlePromptSubmit = () => {
    setLocation("/chat");
  };

  return (
    <InsightsProvider initialTimeRange={timeRange}>
      <motion.div
        {...animationVariants}
        className="flex-1 flex flex-col overflow-y-auto custom-scrollbar min-w-0 min-h-0 relative"
      >
        <BackgroundEffects />
        <div className="w-full min-w-0 px-3 sm:px-5 lg:px-6 py-5 sm:py-8 space-y-5 relative z-10">
          <div className="container mx-auto max-w-7xl space-y-3 text-center sm:text-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter mb-2">
                <span className="text-gradient-animated">AIt</span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-foreground/80">
                Your data. Your AI. <span className="font-semibold text-gradient">One Platform.</span>
              </p>
            </motion.div>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              {isLoading ? (
                <span className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  Loading your content...
                </span>
              ) : totalItems > 0 ? (
                `Discover ${totalItems} ${totalItems === 1 ? "item" : "items"} from your integrations`
              ) : (
                "Connect everything you use—your code, music, notes, tasks—and talk to it all like never before."
              )}
            </p>
          </div>

          <div className="container mx-auto max-w-7xl my-5">
            <DiscoveryStats />
          </div>

          <div className="container mx-auto max-w-7xl my-5">
            <IntegrationsList />
          </div>

          <div className={cn("pb-20 sm:pb-24")}>
            <HomeFeed
              isLoading={isLoading}
              sections={HOME_SECTIONS}
              sectionsData={sectionsData}
              totalItems={totalItems}
            />

            <div className="container mx-auto max-w-7xl my-5">
              <GoalTrackerWidget />
            </div>
          </div>
        </div>

        <FloatingPromptButton onClick={handlePromptClick} onSubmit={handlePromptSubmit} />
      </motion.div>
    </InsightsProvider>
  );
}
