import { formatRelativeTime } from "@/utils/date.utils";
import type { SpotifyRecentlyPlayedEntity as SpotifyRecentlyPlayed } from "@ait/core";
import { motion } from "framer-motion";
import { Clock, Disc3, TrendingUp } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardMedia,
  ConnectorCardMediaOverlay,
  ConnectorCardPlayButton,
  ConnectorCardStatItem,
  ConnectorCardStats,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface RecentlyPlayedCardProps {
  recentlyPlayed: SpotifyRecentlyPlayed;
  onClick?: () => void;
  className?: string;
}

export function RecentlyPlayedCard({ recentlyPlayed, onClick, className }: RecentlyPlayedCardProps) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const albumImage =
    (recentlyPlayed.albumData?.images as any)?.[1]?.url || (recentlyPlayed.albumData?.images as any)?.[0]?.url;

  return (
    <ConnectorCardBase service="spotify" onClick={onClick} className={className} showExternalLink={false}>
      <div className="flex flex-col h-full">
        {/* Album Art */}
        <ConnectorCardMedia service="spotify" className="bg-gradient-to-br from-purple-500/10 to-violet-600/5">
          {albumImage ? (
            <>
              <motion.img
                src={albumImage}
                alt={recentlyPlayed.album || recentlyPlayed.trackName}
                className="w-full h-full object-cover"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
              <ConnectorCardMediaOverlay />
              <ConnectorCardPlayButton service="spotify" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
        </ConnectorCardMedia>

        {/* Content */}
        <ConnectorCardContent className="flex-1 flex flex-col">
          <div className="flex-1 space-y-1.5">
            <ConnectorCardTitle service="spotify" className="line-clamp-2">
              {recentlyPlayed.trackName}
            </ConnectorCardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 font-medium">{recentlyPlayed.artist}</p>
            {recentlyPlayed.album && (
              <p className="text-xs text-muted-foreground/60 line-clamp-1 italic">{recentlyPlayed.album}</p>
            )}
          </div>

          {/* Stats */}
          <ConnectorCardStats className="mt-auto pt-2">
            <ConnectorCardStatItem icon={<Clock className="h-3.5 w-3.5" />}>
              {formatDuration(recentlyPlayed.durationMs)}
            </ConnectorCardStatItem>
            {recentlyPlayed.popularity !== null && (
              <ConnectorCardStatItem icon={<TrendingUp className="h-3.5 w-3.5 text-purple-500" />}>
                {recentlyPlayed.popularity}%
              </ConnectorCardStatItem>
            )}
          </ConnectorCardStats>

          {/* Footer */}
          <ConnectorCardFooter>
            <ConnectorCardFooterBadges>
              <Badge
                variant="outline"
                className="text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              >
                Recently Played
              </Badge>
            </ConnectorCardFooterBadges>
            <ConnectorCardTimestamp>Played {formatRelativeTime(recentlyPlayed.playedAt)}</ConnectorCardTimestamp>
          </ConnectorCardFooter>
        </ConnectorCardContent>
      </div>
    </ConnectorCardBase>
  );
}
