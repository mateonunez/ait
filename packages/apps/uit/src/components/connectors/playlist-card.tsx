import { formatRelativeTime } from "@ait/core";
import { getEntityDate } from "@ait/core";
import type { SpotifyPlaylistEntity as SpotifyPlaylist } from "@ait/core";
import { motion } from "framer-motion";
import { ListMusic, Lock, Music, Users, Users2 } from "lucide-react";
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

interface PlaylistCardProps {
  playlist: SpotifyPlaylist;
  onClick?: () => void;
  className?: string;
}

export function PlaylistCard({ playlist, onClick, className }: PlaylistCardProps) {
  const trackCount = playlist.tracks?.length || 0;
  const playlistImage = playlist.images?.[0]?.url;

  return (
    <ConnectorCardBase service="spotify" onClick={onClick} className={className} showExternalLink={false}>
      <div className="flex flex-col h-full">
        {/* Playlist Cover */}
        <ConnectorCardMedia service="spotify" className="bg-gradient-to-br from-blue-500/10 to-indigo-600/5">
          {playlistImage ? (
            <>
              <motion.img
                src={playlistImage}
                alt={playlist.name}
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
              <ListMusic className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
        </ConnectorCardMedia>

        {/* Content */}
        <ConnectorCardContent className="flex-1 flex flex-col">
          <div className="flex-1 space-y-1.5">
            <ConnectorCardTitle service="spotify" className="line-clamp-2">
              {playlist.name}
            </ConnectorCardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 font-medium">by {playlist.owner}</p>
            {playlist.description && (
              <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed italic">
                {playlist.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <ConnectorCardStats className="mt-auto pt-2">
            <ConnectorCardStatItem icon={<Music className="h-3.5 w-3.5" />}>
              {trackCount} {trackCount === 1 ? "spotify_track" : "tracks"}
            </ConnectorCardStatItem>
            {playlist.followers > 0 && (
              <ConnectorCardStatItem icon={<Users className="h-3.5 w-3.5" />}>
                {playlist.followers.toLocaleString()} follower{playlist.followers !== 1 ? "s" : ""}
              </ConnectorCardStatItem>
            )}
          </ConnectorCardStats>

          {/* Footer */}
          <ConnectorCardFooter>
            <ConnectorCardFooterBadges>
              {!playlist.public && (
                <Badge
                  variant="secondary"
                  className="text-xs font-medium h-5 bg-neutral-800 text-neutral-100 dark:bg-neutral-200 dark:text-neutral-900"
                >
                  <Lock className="h-2.5 w-2.5 mr-1" />
                  Private
                </Badge>
              )}
              {playlist.collaborative && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                >
                  <Users2 className="h-3 w-3 mr-1" />
                  Collab
                </Badge>
              )}
            </ConnectorCardFooterBadges>
            {getEntityDate(playlist) && (
              <ConnectorCardTimestamp>Created {formatRelativeTime(getEntityDate(playlist)!)}</ConnectorCardTimestamp>
            )}
          </ConnectorCardFooter>
        </ConnectorCardContent>
      </div>
    </ConnectorCardBase>
  );
}
