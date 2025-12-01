import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/styles/utils";
import type { IntegrationEntity } from "@/types/integrations.types";
import { type EntityType, getEntityMetadata } from "@ait/core";
import { useLocation } from "wouter";
import { renderCard } from "./card-renderer";

interface HomeSectionProps {
  title: string;
  items: IntegrationEntity[];
  onItemClick?: (item: IntegrationEntity) => void;
  className?: string;
  variant?: "scroll" | "grid" | "bento";
  viewAllHref?: string;
}

function getIntegrationRoute(entityType: EntityType): string | null {
  const metadata = getEntityMetadata(entityType);
  if (!metadata) return null;

  const routeMap: Record<string, string> = {
    spotify: "/integrations/spotify",
    github: "/integrations/github",
    x: "/integrations/x",
    linear: "/integrations/linear",
    notion: "/integrations/notion",
    slack: "/integrations/slack",
    google: "/integrations/google",
  };

  return routeMap[metadata.vendor] || null;
}

export function HomeSection({
  title,
  items,
  onItemClick,
  className,
  variant = "scroll",
  viewAllHref = "/integrations",
}: HomeSectionProps) {
  const [, setLocation] = useLocation();

  if (items.length === 0) {
    return null;
  }

  const handleItemClick = (item: IntegrationEntity) => {
    if (onItemClick) {
      onItemClick(item);
      return;
    }

    // Default: navigate to integration page
    const entityType = (item as any).__type as EntityType;
    const route = getIntegrationRoute(entityType);
    if (route) {
      setLocation(route);
    }
  };

  const renderContent = () => {
    if (variant === "scroll") {
      return <ScrollLayout items={items} onItemClick={handleItemClick} />;
    }

    if (variant === "grid") {
      return <GridLayout items={items} onItemClick={handleItemClick} />;
    }

    if (variant === "bento") {
      return <BentoLayout items={items} onItemClick={handleItemClick} />;
    }

    return null;
  };

  return (
    <section className={cn("w-full space-y-6", className)}>
      {/* Section Header */}
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-sm font-medium text-muted-foreground hover:text-foreground h-8 px-3"
            onClick={() => setLocation(viewAllHref)}
          >
            View All →
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">{renderContent()}</div>
    </section>
  );
}

interface LayoutProps {
  items: IntegrationEntity[];
  onItemClick: (item: IntegrationEntity) => void;
}

function ScrollLayout({ items, onItemClick }: LayoutProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 sm:gap-6 lg:gap-8 py-4">
        {items.map((item, index) => {
          const card = renderCard(item, () => onItemClick(item));
          if (!card) return null;

          return (
            <div
              key={`${(item as any).__type}-${(item as any).id || index}`}
              className="w-[220px] sm:w-[260px] md:w-[280px] lg:w-[320px] shrink-0"
            >
              <div className="group w-full h-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] pointer-events-auto">
                {card}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="mt-2" />
    </ScrollArea>
  );
}

function GridLayout({ items, onItemClick }: LayoutProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {items.map((item, index) => {
        const card = renderCard(item, () => onItemClick(item));
        if (!card) return null;

        return (
          <div
            key={`${(item as any).__type}-${(item as any).id || index}`}
            className="group w-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] pointer-events-auto"
          >
            {card}
          </div>
        );
      })}
    </div>
  );
}

function BentoLayout({ items, onItemClick }: LayoutProps) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 sm:gap-6">
      {items.map((item, index) => {
        const card = renderCard(item, () => onItemClick(item));
        if (!card) return null;

        return (
          <div
            key={`${(item as any).__type}-${(item as any).id || index}`}
            className="mb-4 sm:mb-6 break-inside-avoid group transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] pointer-events-auto"
          >
            {card}
          </div>
        );
      })}
    </div>
  );
}
