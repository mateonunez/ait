import { Youtube, ExternalLink, Video } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { GoogleYouTubeSubscriptionEntity } from "@ait/core";

interface SubscriptionCardProps {
  subscription: GoogleYouTubeSubscriptionEntity;
  onClick?: () => void;
  className?: string;
}

export function GoogleYouTubeSubscriptionCard({ subscription, onClick, className }: SubscriptionCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (subscription.resourceChannelId) {
      window.open(`https://www.youtube.com/channel/${subscription.resourceChannelId}`, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (subscription.resourceChannelId) {
      window.open(`https://www.youtube.com/channel/${subscription.resourceChannelId}`, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border",
        className,
      )}
      onClick={handleClick}
    >
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header with YouTube Icon */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="shrink-0 pt-0.5 text-red-600 dark:text-red-500">
            <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                {subscription.title || "Untitled Channel"}
              </h3>
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open channel in YouTube"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Subscribed {formatRelativeTime(new Date(subscription.publishedAt))}
            </p>
          </div>
        </div>

        {/* Thumbnail and Description */}
        <div className="flex gap-3">
          {subscription.thumbnailUrl && (
            <div className="shrink-0">
              <img
                src={subscription.thumbnailUrl}
                alt={subscription.title}
                className="w-12 h-12 rounded-full object-cover border border-border"
              />
            </div>
          )}
          {subscription.description && (
            <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
              {subscription.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-normal">
              <Video className="h-3 w-3 mr-1" />
              {subscription.totalItemCount} videos
            </Badge>
            {subscription.newItemCount > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">
                {subscription.newItemCount} new
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
