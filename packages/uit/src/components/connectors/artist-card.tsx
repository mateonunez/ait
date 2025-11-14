import { Mic2, TrendingUp } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { SpotifyArtistEntity as SpotifyArtist } from "@ait/core";

interface ArtistCardProps {
  artist: SpotifyArtist;
  onClick?: () => void;
  className?: string;
}

export function ArtistCard({ artist, onClick, className }: ArtistCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const artistImage = artist.images?.[1]?.url || artist.images?.[0]?.url;

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
        {/* Artist Image */}
        {artistImage ? (
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/5">
            <img src={artistImage} alt={artist.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-green-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Mic2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative aspect-square bg-gradient-to-br from-green-500/10 to-green-600/5 flex items-center justify-center">
            <Mic2 className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col">
          <div className="flex-1 space-y-1.5 sm:space-y-2">
            <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
              {artist.name}
            </h3>
            {artist.popularity !== null && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="text-xs sm:text-sm font-medium tabular-nums">{artist.popularity}% popular</span>
              </div>
            )}
          </div>

          {/* Genres */}
          {artist.genres && artist.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {artist.genres.slice(0, 2).map((genre, index) => (
                <Badge key={`${genre}-${index}=${genre}`} variant="secondary" className="text-xs font-normal">
                  {genre.split(":")[1]}
                </Badge>
              ))}
              {artist.genres.length > 2 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{artist.genres.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
            <Badge
              variant="outline"
              className="text-xs font-normal text-green-600 dark:text-green-400 border-green-600/20"
            >
              Artist
            </Badge>
            {artist.createdAt && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Added {formatRelativeTime(artist.createdAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
