import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { AIChatButton } from "@/components/ai-chat-button";
import { HomeSection } from "@/components/home-section";
import { IntegrationsList } from "@/components/integrations-list";
import { useIntegrationsContext } from "@/contexts/integrations.context";
import { contentAlgorithmService } from "@/services/content-algorithm.service";
import type { IntegrationEntity, HomeSection as HomeSectionType } from "@/types/integrations.types";
import { getEntityMetadata } from "@ait/core";
import { Skeleton } from "@/components/ui/skeleton";

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
    entityTypes: ["tweet", "issue", "message"],
  },
  {
    id: "music",
    title: "Your Music",
    entityTypes: ["track", "playlist", "album", "recently_played"],
  },
  {
    id: "code",
    title: "Code & Projects",
    entityTypes: ["repository", "pull_request"],
  },
];

export default function HomePage() {
  const { fetchEntityData } = useIntegrationsContext();
  const [sectionsData, setSectionsData] = useState<Map<string, IntegrationEntity[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHomepageData = async () => {
      setIsLoading(true);
      const newSectionsData = new Map<string, IntegrationEntity[]>();

      try {
        // Fetch data for each section
        for (const section of HOME_SECTIONS) {
          const sectionItems: IntegrationEntity[] = [];

          for (const entityType of section.entityTypes) {
            try {
              const metadata = getEntityMetadata(entityType);
              const response = await fetchEntityData(metadata.vendor, entityType, {
                page: 1,
                limit: 6, // Fetch 6 items per entity type for homepage
              });

              // Use algorithm to select 3-4 items from each entity type
              const selected = contentAlgorithmService.selectItems(response.data, 3);
              sectionItems.push(...selected);
            } catch (error) {
              console.error(`Failed to fetch ${entityType}:`, error);
              // Continue with other entity types even if one fails
            }
          }

          // Shuffle items within section and limit to ~6-8 items per section for better carousel experience
          const shuffled = contentAlgorithmService.shuffle(sectionItems);
          const limited = shuffled.slice(0, 8);
          newSectionsData.set(section.id, limited);
        }

        setSectionsData(newSectionsData);
      } catch (error) {
        console.error("Failed to load homepage data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHomepageData();
  }, [fetchEntityData]);

  const totalItems = useMemo(() => {
    let count = 0;
    for (const items of sectionsData.values()) {
      count += items.length;
    }
    return count;
  }, [sectionsData]);

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
        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
      </motion.main>
    </div>
  );
}
