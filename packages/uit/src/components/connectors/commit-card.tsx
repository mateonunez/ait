import { ExternalLink, User, GitCommit } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { formatRelativeTime } from "@/utils/date.utils";
import type { GitHubCommitEntity as GitHubCommit } from "@ait/core";

interface CommitCardProps {
  commit: GitHubCommit;
  onClick?: () => void;
  className?: string;
}

export function CommitCard({ commit, onClick, className }: CommitCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (commit.htmlUrl) {
      window.open(commit.htmlUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (commit.htmlUrl) {
      window.open(commit.htmlUrl, "_blank", "noopener,noreferrer");
    }
  };

  const shortSha = commit.sha.substring(0, 7);
  const authorAvatar = commit.authorData?.avatar_url as string | undefined;
  const authorLogin = commit.authorData?.login as string | undefined;
  const fileCount = commit.filesData?.length || 0;

  return (
    <Card
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border ${className || ""}`}
      onClick={handleClick}
    >
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header with Avatar and Commit Message */}
        <div className="flex items-start gap-2 sm:gap-3">
          {authorAvatar && (
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-border/50 group-hover:ring-blue-500/20 transition-all flex-shrink-0">
              <AvatarImage src={authorAvatar} alt={authorLogin || "Author"} />
              <AvatarFallback>
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {commit.message}
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <GitCommit className="h-3 w-3" />
                    <span className="font-mono">{shortSha}</span>
                  </div>
                  {commit.repositoryFullName && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">{commit.repositoryFullName}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open commit in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Commit Body */}
        {commit.messageBody && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
            {commit.messageBody}
          </p>
        )}

        {/* Stats */}
        {(commit.additions > 0 || commit.deletions > 0 || fileCount > 0) && (
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono flex-wrap">
            {commit.additions > 0 && (
              <span className="text-green-600 dark:text-green-400 font-medium">+{commit.additions}</span>
            )}
            {commit.deletions > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">-{commit.deletions}</span>
            )}
            {fileCount > 0 && (
              <span className="text-muted-foreground">
                {fileCount} {fileCount === 1 ? "file" : "files"}
              </span>
            )}
            {commit.total > 0 && (
              <span className="text-muted-foreground">
                {commit.total} {commit.total === 1 ? "change" : "changes"}
              </span>
            )}
          </div>
        )}

        {/* Author Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {commit.authorName && (
            <span>
              {commit.authorName}
              {commit.authorEmail && <span className="ml-1">({commit.authorEmail})</span>}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {commit.verification?.verified! && (
              <Badge variant="outline" className="text-xs font-normal text-green-600 dark:text-green-400">
                Verified
              </Badge>
            )}
          </div>
          {commit.committerDate ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(commit.committerDate)}
            </span>
          ) : commit.authorDate ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(commit.authorDate)}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
