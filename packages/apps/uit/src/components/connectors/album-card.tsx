import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@ait/core";
import { getEntityDate } from "@ait/core";
import type { SpotifyAlbumEntity as SpotifyAlbum } from "@ait/core";
import { motion } from "framer-motion";
import { Disc, Music, TrendingUp } from "lucide-react";
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

interface AlbumCardProps {
  album: SpotifyAlbum;
  onClick?: () => void;
  className?: string;
}

export function AlbumCard({ album, onClick, className }: AlbumCardProps) {
  const artistsList = album.artists?.join(", ") || "Unknown Artist";
  const albumImage = album.images?.[1]?.url || album.images?.[0]?.url;

  const getAlbumTypeColor = () => {
    switch (album.albumType?.toLowerCase()) {
      case "spotify_album":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "single":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "compilation":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-muted";
    }
  };

  return (
    <ConnectorCardBase service="spotify" onClick={onClick} className={className} showExternalLink={false}>
      <div className="flex flex-col h-full">
        {/* Album Artwork */}
        <ConnectorCardMedia service="spotify" className="bg-gradient-to-br from-amber-500/10 to-orange-600/5">
          {albumImage ? (
            <>
              <motion.img
                src={albumImage}
                alt={album.name}
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
              <Disc className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}

          {/* Release year badge */}
          {album.releaseDate && (
            <motion.div
              className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {album.releaseDate.slice(0, 4)}
            </motion.div>
          )}
        </ConnectorCardMedia>

        {/* Content */}
        <ConnectorCardContent className="flex-1 flex flex-col">
          <div className="flex-1 space-y-1.5">
            <ConnectorCardTitle service="spotify" className="line-clamp-2">
              {album.name}
            </ConnectorCardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 font-medium">{artistsList}</p>
          </div>

          {/* Stats */}
          <ConnectorCardStats className="mt-auto pt-2">
            <ConnectorCardStatItem icon={<Music className="h-3.5 w-3.5" />}>
              {album.tracks.length} {album.tracks.length === 1 ? "spotify_track" : "tracks"}
            </ConnectorCardStatItem>
            {album.popularity !== null && (
              <ConnectorCardStatItem icon={<TrendingUp className="h-3.5 w-3.5 text-green-500" />}>
                {album.popularity}%
              </ConnectorCardStatItem>
            )}
          </ConnectorCardStats>

          {/* Footer */}
          <ConnectorCardFooter>
            <ConnectorCardFooterBadges>
              <Badge variant="outline" className={cn("text-xs font-medium capitalize", getAlbumTypeColor())}>
                {album.albumType}
              </Badge>
            </ConnectorCardFooterBadges>
            {getEntityDate(album) && (
              <ConnectorCardTimestamp>Added {formatRelativeTime(getEntityDate(album)!)}</ConnectorCardTimestamp>
            )}
          </ConnectorCardFooter>
        </ConnectorCardContent>
      </div>
    </ConnectorCardBase>
  );
}
