import { HomeSection } from "@/components/home-section";
import { Skeleton } from "@/components/ui/skeleton";
import type { HomeSection as HomeSectionType } from "@/types/integrations.types";
import type { IntegrationEntity } from "@/types/integrations.types";

interface HomeFeedProps {
  isLoading: boolean;
  sections: HomeSectionType[];
  sectionsData: Map<string, IntegrationEntity[]>;
  totalItems: number;
}

export function HomeFeed({ isLoading, sections, sectionsData, totalItems }: HomeFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8">
        {sections.map((section) => (
          <div key={section.id} className="space-y-3 sm:space-y-4">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <Skeleton className="h-7 w-48" />
            </div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex gap-3 sm:gap-4 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-72 w-[220px] sm:w-[240px] md:w-[280px] flex-shrink-0 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-8">
      {sections.map((section) => {
        const items = sectionsData.get(section.id) || [];
        if (items.length === 0) return null;

        return <HomeSection key={section.id} title={section.title} items={items} variant={section.variant} />;
      })}

      {totalItems === 0 && (
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
  );
}
