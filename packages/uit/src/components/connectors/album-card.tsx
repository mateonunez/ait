import { Disc, Music, Calendar, TrendingUp, Play } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { SpotifyAlbumEntity as SpotifyAlbum } from "@ait/core";

interface AlbumCardProps {
  album: SpotifyAlbum;
  onClick?: () => void;
  className?: string;
}

export function AlbumCard({ album, onClick, className }: AlbumCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const artistsList = album.artists?.join(", ") || "Unknown Artist";
  const albumImage = album.images?.[1]?.url || album.images?.[0]?.url;

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
        {/* Album Artwork */}
        {albumImage ? (
          <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-orange-500/10 to-orange-600/5">
            <img src={albumImage} alt={album.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="h-14 w-14 rounded-full bg-orange-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative aspect-square bg-gradient-to-br from-orange-500/10 to-orange-600/5 flex items-center justify-center">
            <Disc className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base leading-tight line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
              {album.name}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1">{artistsList}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Music className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">
                {album.tracks.length} {album.tracks.length === 1 ? "track" : "tracks"}
              </span>
            </div>
            {album.releaseDate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium">{album.releaseDate.slice(0, 4)}</span>
              </div>
            )}
            {album.popularity !== null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="font-medium tabular-nums">{album.popularity}%</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <Badge variant="outline" className="text-xs font-normal capitalize">
              {album.albumType}
            </Badge>
            {album.createdAt && (
              <span className="text-xs text-muted-foreground">Added {formatRelativeTime(album.createdAt)}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
