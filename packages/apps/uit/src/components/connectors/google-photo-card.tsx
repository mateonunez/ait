import { Badge } from "@/components/ui/badge";
import type { GooglePhotoEntity } from "@ait/core";
import { format } from "date-fns";
import { Camera, Image as ImageIcon } from "lucide-react";

interface GooglePhotoCardProps {
  photo: GooglePhotoEntity;
}

export function GooglePhotoCard({ photo }: GooglePhotoCardProps) {
  const thumbnailSrc = photo.localPath
    ? `/api/assets/${photo.localPath}`
    : photo.baseUrl
      ? `${photo.baseUrl}=w500-h500-c`
      : undefined;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-all hover:shadow-md">
      {/* Image Thumbnail */}
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={photo.filename}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = ""; // Fallback or clear
              (e.target as HTMLImageElement).classList.add("hidden");
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate" title={photo.filename}>
              {photo.filename}
            </h4>
            {photo.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{photo.description}</p>
            )}
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {photo.mediaMetadata.width}x{photo.mediaMetadata.height}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" />
            <span>{photo.mediaMetadata.photo?.cameraModel || "Unknown Camera"}</span>
          </div>
          {photo.mediaMetadata.creationTime && (
            <span title={photo.mediaMetadata.creationTime}>
              {format(new Date(photo.mediaMetadata.creationTime), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
