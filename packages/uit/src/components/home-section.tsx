import { useLocation } from "wouter";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { IntegrationEntity } from "@/types/integrations.types";
import { getEntityMetadata } from "@ait/core";
import { cn } from "@/styles/utils";
import { TrackCard } from "@/components/connectors/track-card";
import { ArtistCard } from "@/components/connectors/artist-card";
import { PlaylistCard } from "@/components/connectors/playlist-card";
import { AlbumCard } from "@/components/connectors/album-card";
import { RecentlyPlayedCard } from "@/components/connectors/recently-played-card";
import { RepositoryCard } from "@/components/connectors/repository-card";
import { PullRequestCard } from "@/components/connectors/pull-request-card";
import { CommitCard } from "@/components/connectors/commit-card";
import { IssueCard } from "@/components/connectors/issue-card";
import { TweetCard } from "@/components/connectors/tweet-card";
import { PageCard } from "@/components/connectors/page-card";
import { MessageCard } from "@/components/connectors/message-card";
import type {
  SpotifyTrackEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyAlbumEntity,
  SpotifyRecentlyPlayedEntity,
  GitHubRepositoryEntity,
  GitHubPullRequestEntity,
  GitHubCommitEntity,
  LinearIssueEntity,
  XTweetEntity,
  NotionPageEntity,
  SlackMessageEntity,
} from "@ait/core";

interface HomeSectionProps {
  title: string;
  items: IntegrationEntity[];
  onItemClick?: (item: IntegrationEntity) => void;
  className?: string;
}

function getIntegrationRoute(entityType: string): string | null {
  const metadata = getEntityMetadata(entityType as any);
  if (!metadata) return null;

  const routeMap: Record<string, string> = {
    spotify: "/integrations/spotify",
    github: "/integrations/github",
    x: "/integrations/x",
    linear: "/integrations/linear",
    notion: "/integrations/notion",
    slack: "/integrations/slack",
  };

  return routeMap[metadata.vendor] || null;
}

function renderCard(item: IntegrationEntity, onClick?: () => void) {
  const type = (item as any).__type;

  switch (type) {
    case "track":
      return <TrackCard track={item as SpotifyTrackEntity} onClick={onClick} />;
    case "artist":
      return <ArtistCard artist={item as SpotifyArtistEntity} onClick={onClick} />;
    case "playlist":
      return <PlaylistCard playlist={item as SpotifyPlaylistEntity} onClick={onClick} />;
    case "album":
      return <AlbumCard album={item as SpotifyAlbumEntity} onClick={onClick} />;
    case "recently_played":
      return <RecentlyPlayedCard recentlyPlayed={item as SpotifyRecentlyPlayedEntity} onClick={onClick} />;
    case "repository":
      return <RepositoryCard repository={item as GitHubRepositoryEntity} onClick={onClick} />;
    case "pull_request":
      return <PullRequestCard pullRequest={item as GitHubPullRequestEntity} onClick={onClick} />;
    case "commit":
      return <CommitCard commit={item as GitHubCommitEntity} onClick={onClick} />;
    case "issue":
      return <IssueCard issue={item as LinearIssueEntity} onClick={onClick} />;
    case "tweet":
      return <TweetCard tweet={item as XTweetEntity} onClick={onClick} />;
    case "page":
      return <PageCard page={item as NotionPageEntity} onClick={onClick} />;
    case "message":
      return <MessageCard message={item as SlackMessageEntity} onClick={onClick} />;
    default:
      return null;
  }
}

export function HomeSection({ title, items, onItemClick, className }: HomeSectionProps) {
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
    const entityType = (item as any).__type;
    const route = getIntegrationRoute(entityType);
    if (route) {
      setLocation(route);
    }
  };

  return (
    <section className={cn("w-full space-y-3 sm:space-y-4", className)}>
      {/* Section Header */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              // Navigate to the first item's integration page
              if (items.length > 0) {
                const entityType = (items[0] as any).__type;
                const route = getIntegrationRoute(entityType);
                if (route) {
                  setLocation(route);
                }
              }
            }}
          >
            View All →
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative w-full py-1">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-7xl">
            <Carousel
              opts={{
                align: "start",
                loop: false,
                skipSnaps: false,
                dragFree: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-4 sm:-ml-6 md:-ml-8 py-2">
                {items.map((item, index) => {
                  const card = renderCard(item, () => handleItemClick(item));
                  if (!card) return null;

                  return (
                    <CarouselItem
                      key={`${(item as any).__type}-${(item as any).id || index}`}
                      className="pl-4 sm:pl-6 md:pl-8 !basis-[200px] sm:!basis-[240px] md:!basis-[280px] lg:!basis-[300px] flex-shrink-0 min-w-0"
                    >
                      <div className="w-full max-w-full p-1 [&>*]:transition-all [&>*]:duration-200 [&>*]:hover:scale-[1.03] [&>*]:active:scale-[0.98] pointer-events-auto">
                        {card}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>

              {/* Navigation Buttons - Only show on larger screens */}
              {items.length > 3 && (
                <div className="hidden md:block">
                  <CarouselPrevious className="left-0 lg:-left-12 -translate-y-1/2 top-1/2" />
                  <CarouselNext className="right-0 lg:-right-12 -translate-y-1/2 top-1/2" />
                </div>
              )}
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
}
