import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIChatButton } from "@/components/ai-chat-button";
import { HomeSection } from "@/components/home-section";
import { IntegrationsList } from "@/components/integrations-list";
import { PromptInput } from "@/components/ai-elements/prompt-input";
import { useHomepageData } from "@/hooks/useHomepageData";
import { useChatDialog } from "@/contexts/chat.context";
import type { HomeSection as HomeSectionType } from "@/types/integrations.types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/styles/utils";

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

  const handlePromptClick = () => {
    openChat();
  };

  const handlePromptSubmit = () => {
    openChat();
  };

  return (
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
            <AIChatButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main {...animationVariants} className="flex-1 flex flex-col overflow-hidden">
        {/* Hero Section */}
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

          {/* Integrations List */}
          <IntegrationsList />
        </div>

        {/* Sections */}
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar", !isOpen && "pb-24 sm:pb-28")}>
          {isLoading ? (
            <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8">
              {HOME_SECTIONS.map((section) => (
                <div key={section.id} className="space-y-3 sm:space-y-4">
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <Skeleton className="h-7 w-48" />
                  </div>
                  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-3 sm:gap-4 overflow-hidden">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton
                          key={i}
                          className="h-72 w-[220px] sm:w-[240px] md:w-[280px] flex-shrink-0 rounded-xl"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8">
              {HOME_SECTIONS.map((section) => {
                const items = sectionsData.get(section.id) || [];
                if (items.length === 0) return null;

                return <HomeSection key={section.id} title={section.title} items={items} />;
              })}

              {totalItems === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-center px-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-3xl" />
                    </div>
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mx-auto">
                        <span className="text-3xl">📊</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-foreground">No content yet</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Connect your integrations to see your data here. Start by connecting GitHub, Spotify, or other
                          services.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Prompt Input - Hidden when chat dialog is open */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-6 sm:bottom-8 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 pointer-events-none"
            >
              <div className="container mx-auto max-w-xl">
                <button
                  type="button"
                  onClick={handlePromptClick}
                  className={cn(
                    "relative w-full cursor-pointer pointer-events-auto",
                    "rounded-2xl overflow-hidden transition-all duration-300",
                    "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-transparent",

                    // Blur and saturation, same for both
                    "backdrop-blur-[40px] backdrop-saturate-[180%]",
                    "dark:backdrop-blur-[40px] dark:backdrop-saturate-[200%]",

                    // LIGHT MODE, bright glass
                    "bg-gradient-to-br",
                    "from-white/[0.25] via-white/[0.15] to-white/[0.08]",

                    // DARK MODE, same structure but very low white tint (darkest possible glass)
                    "dark:bg-gradient-to-br",
                    "dark:from-black/[0.12] dark:via-black/[0.06] dark:to-black/[0.02]",

                    // Borders
                    "border border-white/40",
                    "dark:border-black/18",

                    // Shadows
                    "shadow-[0_8px_32px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.03)]",
                    "dark:shadow-[0_10px_36px_rgba(0,0,0,0.85)]",

                    // Hover, same idea as base, just a bit more intense
                    "hover:backdrop-blur-[50px] hover:backdrop-saturate-[200%]",
                    "dark:hover:backdrop-blur-[50px] dark:hover:backdrop-saturate-[220%]",

                    "hover:bg-gradient-to-br",
                    "hover:from-white/[0.35] hover:via-white/[0.22] hover:to-white/[0.12]",
                    "dark:hover:bg-gradient-to-br",
                    "dark:hover:from-black/[0.16] dark:hover:via-black/[0.09] dark:hover:to-black/[0.04]",

                    "hover:border-white/50",
                    "dark:hover:border-black/24",

                    "hover:shadow-[0_12px_48px_rgba(0,0,0,0.08),0_6px_24px_rgba(0,0,0,0.04)]",
                    "dark:hover:shadow-[0_14px_52px_rgba(0,0,0,0.95)]",

                    // Top reflection
                    "before:absolute before:inset-0 before:rounded-2xl before:pointer-events-none",
                    "before:bg-gradient-to-b before:from-white/[0.2] before:via-white/[0.08] before:to-transparent",
                    "dark:before:bg-gradient-to-b dark:before:from-black/[0.14] dark:before:via-black/[0.05] dark:before:to-transparent",

                    // Bottom inner glow
                    "after:absolute after:inset-[1px] after:rounded-2xl after:pointer-events-none",
                    "after:bg-gradient-to-t after:from-transparent after:via-transparent after:to-white/[0.08]",
                    "dark:after:bg-gradient-to-t dark:after:from-transparent dark:after:via-transparent dark:after:to-white/[0.03]",
                  )}
                  aria-label="Ask AIt anything..."
                >
                  <PromptInput
                    onSubmit={handlePromptSubmit}
                    placeholder="Ask AIt anything..."
                    className="max-w-full pointer-events-none"
                    disabled={true}
                    variant="floating"
                  />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
