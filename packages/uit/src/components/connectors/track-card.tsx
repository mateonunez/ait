import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@/utils/date.utils";
import type { SpotifyTrackEntity as SpotifyTrack } from "@ait/core";
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

interface TrackCardProps {
  track: SpotifyTrack;
  onClick?: () => void;
  className?: string;
}

export function TrackCard({ track, onClick, className }: TrackCardProps) {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const albumImage = (track.albumData?.images as any)?.[1]?.url || (track.albumData?.images as any)?.[0]?.url;

  return (
    <ConnectorCardBase service="spotify" onClick={onClick} className={className} showExternalLink={false}>
      <div className="flex flex-col h-full">
        {/* Album Art */}
        <ConnectorCardMedia service="spotify" className="bg-gradient-to-br from-green-500/10 to-emerald-600/5">
          {albumImage ? (
            <>
              <motion.img
                src={albumImage}
                alt={track.album || track.name}
                className="w-full h-full object-cover"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
              <ConnectorCardMediaOverlay />
              {track.previewUrl && <ConnectorCardPlayButton service="spotify" />}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="h-16 w-16 text-muted-foreground/20 animate-spin-slow" />
            </div>
          )}
        </ConnectorCardMedia>

        {/* Content */}
        <ConnectorCardContent className="flex-1 flex flex-col">
          <div className="flex-1 space-y-1.5">
            <ConnectorCardTitle service="spotify" className="line-clamp-2">
              {track.name}
            </ConnectorCardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 font-medium">{track.artist}</p>
            {track.album && <p className="text-xs text-muted-foreground/60 line-clamp-1 italic">{track.album}</p>}
          </div>

          {/* Stats */}
          <ConnectorCardStats className="mt-auto pt-2">
            <ConnectorCardStatItem icon={<Clock className="h-3.5 w-3.5" />}>
              {formatDuration(track.durationMs)}
            </ConnectorCardStatItem>
            {track.popularity !== null && (
              <ConnectorCardStatItem icon={<TrendingUp className="h-3.5 w-3.5 text-green-500" />}>
                <PopularityBar value={track.popularity} />
              </ConnectorCardStatItem>
            )}
          </ConnectorCardStats>

          {/* Footer */}
          <ConnectorCardFooter>
            <ConnectorCardFooterBadges>
              {track.explicit && (
                <Badge
                  variant="secondary"
                  className="text-xs font-bold h-5 px-1.5 bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900"
                >
                  E
                </Badge>
              )}
              <SpotifyLogo />
            </ConnectorCardFooterBadges>
            {track.addedAt && (
              <ConnectorCardTimestamp>Added {formatRelativeTime(track.addedAt)}</ConnectorCardTimestamp>
            )}
          </ConnectorCardFooter>
        </ConnectorCardContent>
      </div>
    </ConnectorCardBase>
  );
}

/**
 * Visual popularity bar
 */
function PopularityBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-px">
        {[...Array(5)].map((_, i) => (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: it's the key
            key={`popularity-bar-${i}`}
            className={cn(
              "w-1 h-2.5 rounded-sm",
              i < Math.round(value / 20) ? "bg-green-500 dark:bg-green-400" : "bg-muted-foreground/20",
            )}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          />
        ))}
      </div>
      <span className="text-[10px] tabular-nums opacity-70">{value}%</span>
    </div>
  );
}

/**
 * Spotify logo badge
 */
function SpotifyLogo() {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: it's the logo
    <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}
