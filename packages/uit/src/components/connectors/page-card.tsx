import { FileText, ExternalLink, Archive } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { NotionPageEntity as NotionPage } from "@ait/core";

interface PageCardProps {
  page: NotionPage;
  onClick?: () => void;
  className?: string;
}

export function PageCard({ page, onClick, className }: PageCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (page.url) {
      window.open(page.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (page.url) {
      window.open(page.url, "_blank", "noopener,noreferrer");
    }
  };

  const isEmoji = (icon: string | null): boolean => {
    if (!icon) return false;
    // Simple check: emojis are typically single characters or short strings
    return icon.length <= 2 || /^[\p{Emoji}]/u.test(icon);
  };

  const getIconDisplay = () => {
    if (!page.icon) {
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    }

    if (isEmoji(page.icon)) {
      return <span className="text-2xl">{page.icon}</span>;
    }

    // It's a URL
    return <img src={page.icon} alt="" className="h-5 w-5 object-contain rounded" />;
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border",
        className,
      )}
      onClick={handleClick}
    >
      {page.cover && (
        <div className="h-24 sm:h-32 w-full overflow-hidden">
          <img src={page.cover} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={cn("p-3 sm:p-4 space-y-2 sm:space-y-3", page.cover && "pt-3 sm:pt-4")}>
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="flex-shrink-0 pt-0.5">{getIconDisplay()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {page.title}
              </h3>
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open page in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            {page.parentType && page.parentType !== "workspace" && (
              <p className="text-xs text-muted-foreground mt-1">
                {page.parentType === "database_id" ? "In database" : "In page"}
              </p>
            )}
          </div>
        </div>

        {/* Content Preview */}
        {page.content && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed">{page.content}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {page.archived && (
              <Badge variant="secondary" className="text-xs font-normal">
                <Archive className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                Archived
              </Badge>
            )}
            {page.parentType && (
              <Badge variant="outline" className="text-xs font-normal capitalize">
                {page.parentType.replace("_id", "").replace("_", " ")}
              </Badge>
            )}
          </div>
          {page.updatedAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Updated {formatRelativeTime(page.updatedAt)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
