import { Music, Clock, TrendingUp, Play, Disc3 } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { SpotifyTrackEntity as SpotifyTrack } from "@ait/core";

interface TrackCardProps {
  track: SpotifyTrack;
  onClick?: () => void;
  className?: string;
}

export function TrackCard({ track, onClick, className }: TrackCardProps) {
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

  const albumImage = (track.albumData?.images as any)?.[1]?.url || (track.albumData?.images as any)?.[0]?.url;

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
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/5">
            <img src={albumImage} alt={track.album || track.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {track.previewUrl && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Play className="h-5 w-5 sm:h-6 sm:w-6 text-white ml-0.5" fill="white" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="relative aspect-square bg-gradient-to-br from-green-500/10 to-green-600/5 flex items-center justify-center">
            <Disc3 className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col">
          <div className="flex-1 space-y-1.5 sm:space-y-2">
            <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              {track.name}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{track.artist}</p>
            {track.album && <p className="text-xs text-muted-foreground/70 line-clamp-1">{track.album}</p>}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="font-medium tabular-nums">{formatDuration(track.durationMs)}</span>
            </div>
            {track.popularity !== null && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="font-medium tabular-nums">{track.popularity}%</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {track.explicit && (
                <Badge variant="secondary" className="text-xs font-normal h-4 sm:h-5">
                  E
                </Badge>
              )}
              <Music className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-600 dark:text-green-400" />
            </div>
            {track.createdAt && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Added {formatRelativeTime(track.addedAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
