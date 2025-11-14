import { Star, GitFork, Code2, ExternalLink, User } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { formatRelativeTime } from "@/utils/date.utils";
import type { GitHubRepositoryEntity as GitHubRepository } from "@ait/core";

interface RepositoryCardProps {
  repository: GitHubRepository;
  onClick?: () => void;
  className?: string;
}

export function RepositoryCard({ repository, onClick, className }: RepositoryCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (repository.url) {
      window.open(repository.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (repository.url) {
      window.open(repository.url, "_blank", "noopener,noreferrer");
    }
  };

  const ownerAvatar = repository.ownerData?.avatar_url as string | undefined;
  const ownerLogin = repository.ownerData?.login as string | undefined;

  return (
    <Card
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border ${className || ""}`}
      onClick={handleClick}
    >
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header with Avatar and Title */}
        <div className="flex items-start gap-2 sm:gap-3">
          {ownerAvatar && (
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-border/50 group-hover:ring-primary/20 transition-all flex-shrink-0">
              <AvatarImage src={ownerAvatar} alt={ownerLogin || "Repository owner"} />
              <AvatarFallback>
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {repository.name}
                </h3>
                {repository.fullName && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{repository.fullName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open repository in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {repository.description && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
            {repository.description}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-yellow-400/20 text-yellow-600 dark:text-yellow-400" />
            <span className="font-medium tabular-nums">{repository.stars.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <GitFork className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium tabular-nums">{repository.forks.toLocaleString()}</span>
          </div>
          {repository.language && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <Code2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="text-xs font-medium">{repository.language}</span>
            </div>
          )}
        </div>

        {/* Footer with metadata */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {repository.private && (
              <Badge variant="outline" className="text-xs font-normal">
                Private
              </Badge>
            )}
            {repository.fork && (
              <Badge variant="outline" className="text-xs font-normal">
                Fork
              </Badge>
            )}
            {repository.archived && (
              <Badge variant="secondary" className="text-xs font-normal">
                Archived
              </Badge>
            )}
          </div>
          {repository.pushedAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Updated {formatRelativeTime(repository.pushedAt)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
