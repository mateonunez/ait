import { ExternalLink, User } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { GitHubPullRequestEntity as GitHubPullRequest } from "@ait/core";

interface PullRequestCardProps {
  pullRequest: GitHubPullRequest;
  onClick?: () => void;
  className?: string;
}

export function PullRequestCard({ pullRequest, onClick, className }: PullRequestCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (pullRequest.htmlUrl) {
      window.open(pullRequest.htmlUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pullRequest.htmlUrl) {
      window.open(pullRequest.htmlUrl, "_blank", "noopener,noreferrer");
    }
  };

  const getStateColor = () => {
    if (pullRequest.merged) {
      return "text-purple-600 dark:text-purple-400";
    }
    if (pullRequest.state === "closed") {
      return "text-red-600 dark:text-red-400";
    }
    return "text-green-600 dark:text-green-400";
  };

  const getStateText = () => {
    if (pullRequest.merged) return "Merged";
    if (pullRequest.state === "closed") return "Closed";
    if (pullRequest.draft) return "Draft";
    return "Open";
  };

  const userAvatar = pullRequest.userData?.avatar_url as string | undefined;
  const userLogin = pullRequest.userData?.login as string | undefined;

  return (
    <Card
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border ${className || ""}`}
      onClick={handleClick}
    >
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header with Avatar and Title */}
        <div className="flex items-start gap-2 sm:gap-3">
          {userAvatar && (
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-2 ring-border/50 group-hover:ring-blue-500/20 transition-all flex-shrink-0">
              <AvatarImage src={userAvatar} alt={userLogin || "User"} />
              <AvatarFallback>
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {pullRequest.title}
                </h3>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground">#{pullRequest.number}</span>
                  {pullRequest.repositoryFullName && (
                    <>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground truncate">{pullRequest.repositoryFullName}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open pull request in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body preview */}
        {pullRequest.body && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">{pullRequest.body}</p>
        )}

        {/* Changes Stats */}
        {(pullRequest.additions !== null || pullRequest.deletions !== null || pullRequest.commits !== null) && (
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono flex-wrap">
            {pullRequest.commits !== null && pullRequest.commits > 0 && (
              <span className="text-muted-foreground font-medium">
                {pullRequest.commits} {pullRequest.commits === 1 ? "commit" : "commits"}
              </span>
            )}
            {pullRequest.additions !== null && (
              <span className="text-green-600 dark:text-green-400 font-medium">+{pullRequest.additions}</span>
            )}
            {pullRequest.deletions !== null && (
              <span className="text-red-600 dark:text-red-400 font-medium">-{pullRequest.deletions}</span>
            )}
            {pullRequest.changedFiles !== null && (
              <span className="text-muted-foreground">
                {pullRequest.changedFiles} {pullRequest.changedFiles === 1 ? "file" : "files"}
              </span>
            )}
          </div>
        )}

        {/* Comments & Review Stats */}
        {((pullRequest.comments !== null && pullRequest.comments > 0) ||
          (pullRequest.reviewComments !== null && pullRequest.reviewComments > 0)) && (
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
            {pullRequest.comments !== null && pullRequest.comments > 0 && (
              <span>
                💬 {pullRequest.comments} comment{pullRequest.comments === 1 ? "" : "s"}
              </span>
            )}
            {pullRequest.reviewComments !== null && pullRequest.reviewComments > 0 && (
              <span>
                👁 {pullRequest.reviewComments} review{pullRequest.reviewComments === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs font-normal", getStateColor())}>
              {getStateText()}
            </Badge>
            {pullRequest.authorAssociation && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-normal",
                  pullRequest.authorAssociation === "OWNER" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                  pullRequest.authorAssociation === "CONTRIBUTOR" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                )}
              >
                {pullRequest.authorAssociation}
              </Badge>
            )}
            {pullRequest.mergeableState && pullRequest.mergeableState !== "clean" && (
              <Badge variant="outline" className="text-xs font-normal text-yellow-600 dark:text-yellow-400">
                {pullRequest.mergeableState}
              </Badge>
            )}
          </div>
          {pullRequest.mergedAt ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Merged {formatRelativeTime(pullRequest.mergedAt)}
            </span>
          ) : pullRequest.prUpdatedAt ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Updated {formatRelativeTime(pullRequest.prUpdatedAt)}
            </span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
