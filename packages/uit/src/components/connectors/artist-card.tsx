import { Mic2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardTitle,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardTimestamp,
  ConnectorCardMedia,
  ConnectorCardMediaOverlay,
} from "./connector-card-base";
import type { SpotifyArtistEntity as SpotifyArtist } from "@ait/core";

interface ArtistCardProps {
  artist: SpotifyArtist;
  onClick?: () => void;
  className?: string;
}

export function ArtistCard({ artist, onClick, className }: ArtistCardProps) {
  const artistImage = artist.images?.[1]?.url || artist.images?.[0]?.url;

  return (
    <ConnectorCardBase service="spotify" onClick={onClick} className={className} showExternalLink={false}>
      <div className="flex flex-col h-full">
        {/* Artist Image */}
        <ConnectorCardMedia service="spotify" className="bg-gradient-to-br from-green-500/10 to-emerald-600/5">
          {artistImage ? (
            <>
              <motion.img
                src={artistImage}
                alt={artist.name}
                className="w-full h-full object-cover"
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
              <ConnectorCardMediaOverlay />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <motion.div
                  className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Mic2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </motion.div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Mic2 className="h-16 w-16 text-muted-foreground/20" />
            </div>
          )}
        </ConnectorCardMedia>

        {/* Content */}
        <ConnectorCardContent className="flex-1 flex flex-col">
          <div className="flex-1 space-y-1.5">
            <ConnectorCardTitle service="spotify" className="line-clamp-2">
              {artist.name}
            </ConnectorCardTitle>
            {artist.popularity !== null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs sm:text-sm font-medium">{artist.popularity}% popularity</span>
              </div>
            )}
          </div>

          {/* Genres */}
          {artist.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {artist.genres.slice(0, 3).map((genre, index) => {
                const genreName = genre.includes(":") ? genre.split(":")[1] : genre;
                return (
                  <motion.div
                    // biome-ignore lint/suspicious/noArrayIndexKey:  its ok
                    key={`${genre}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20"
                    >
                      {genreName}
                    </Badge>
                  </motion.div>
                );
              })}
              {artist.genres.length > 3 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{artist.genres.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <ConnectorCardFooter className="mt-auto">
            <ConnectorCardFooterBadges>
              <Badge
                variant="outline"
                className="text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
              >
                <Mic2 className="h-3 w-3 mr-1" />
                Artist
              </Badge>
            </ConnectorCardFooterBadges>
            {artist.createdAt && (
              <ConnectorCardTimestamp>Added {formatRelativeTime(artist.createdAt)}</ConnectorCardTimestamp>
            )}
          </ConnectorCardFooter>
        </ConnectorCardContent>
      </div>
    </ConnectorCardBase>
  );
}
