import { Clock, Play, TrendingUp, Disc3 } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { SpotifyRecentlyPlayed } from "@/services/types";

interface RecentlyPlayedCardProps {
  recentlyPlayed: SpotifyRecentlyPlayed;
  onClick?: () => void;
  className?: string;
}

export function RecentlyPlayedCard({ recentlyPlayed, onClick, className }: RecentlyPlayedCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const albumImage = recentlyPlayed.albumData?.images?.[1]?.url || recentlyPlayed.albumData?.images?.[0]?.url;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border",
        className,
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col h-full">
        {/* Album Art */}
        {albumImage ? (
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <img
              src={albumImage}
              alt={recentlyPlayed.album || recentlyPlayed.trackName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="h-14 w-14 rounded-full bg-purple-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative aspect-square bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center">
            <Disc3 className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {recentlyPlayed.trackName}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{recentlyPlayed.artist}</p>
            {recentlyPlayed.album && (
              <p className="text-xs text-muted-foreground/70 line-clamp-1">{recentlyPlayed.album}</p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">{formatDuration(recentlyPlayed.durationMs)}</span>
            </div>
            {recentlyPlayed.popularity !== null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{recentlyPlayed.popularity}%</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <Badge
              variant="outline"
              className="text-xs font-normal text-purple-600 dark:text-purple-400 border-purple-600/20"
            >
              Recently Played
            </Badge>
            <span className="text-xs text-muted-foreground">Played {formatRelativeTime(recentlyPlayed.playedAt)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
