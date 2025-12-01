import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@/utils/date.utils";
import type { GitHubPullRequestEntity as GitHubPullRequest } from "@ait/core";
import { motion } from "framer-motion";
import { Eye, FileCode, GitMerge, GitPullRequest, MessageSquare, User, XCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardDescription,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardHeader,
  ConnectorCardStats,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface PullRequestCardProps {
  pullRequest: GitHubPullRequest;
  onClick?: () => void;
  className?: string;
}

export function PullRequestCard({ pullRequest, onClick, className }: PullRequestCardProps) {
  const userAvatar = pullRequest.userData?.avatar_url as string | undefined;
  const userLogin = pullRequest.userData?.login as string | undefined;

  const getStateConfig = () => {
    if (pullRequest.merged) {
      return {
        icon: GitMerge,
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        label: "Merged",
      };
    }
    if (pullRequest.state === "closed") {
      return {
        icon: XCircle,
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        label: "Closed",
      };
    }
    if (pullRequest.draft) {
      return {
        icon: GitPullRequest,
        color: "text-neutral-500 dark:text-neutral-400",
        bg: "bg-neutral-500/10",
        border: "border-neutral-500/30",
        label: "Draft",
      };
    }
    return {
      icon: GitPullRequest,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Open",
    };
  };

  const stateConfig = getStateConfig();
  const StateIcon = stateConfig.icon;

  return (
    <ConnectorCardBase service="github" onClick={onClick} externalUrl={pullRequest.htmlUrl} className={className}>
      <ConnectorCardContent>
        {/* Header with Avatar and Title */}
        <ConnectorCardHeader>
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-border/50 group-hover:ring-blue-500/40 transition-all duration-300">
              <AvatarImage src={userAvatar} alt={userLogin || "User"} />
              <AvatarFallback className="bg-slate-800 text-slate-200">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </AvatarFallback>
            </Avatar>
            <motion.div
              className={cn(
                "absolute -bottom-1 -right-1 rounded-full p-0.5",
                stateConfig.bg,
                "border",
                stateConfig.border,
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <StateIcon className={cn("h-3 w-3", stateConfig.color)} />
            </motion.div>
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="github" className="line-clamp-2">
              {pullRequest.title}
            </ConnectorCardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">#{pullRequest.number}</span>
              {pullRequest.repositoryFullName && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px] opacity-70">
                    {pullRequest.repositoryFullName}
                  </span>
                </>
              )}
            </div>
          </div>
        </ConnectorCardHeader>

        {/* Body preview */}
        {pullRequest.body && (
          <ConnectorCardDescription className="line-clamp-2">{pullRequest.body}</ConnectorCardDescription>
        )}

        {/* Changes Stats */}
        {(pullRequest.additions !== null || pullRequest.deletions !== null || pullRequest.commits !== null) && (
          <ConnectorCardStats className="font-mono">
            {pullRequest.commits !== null && pullRequest.commits > 0 && (
              <span className="text-muted-foreground font-medium">
                {pullRequest.commits} {pullRequest.commits === 1 ? "commit" : "commits"}
              </span>
            )}
            {pullRequest.additions !== null && (
              <motion.span
                className="text-emerald-600 dark:text-emerald-400 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                +{pullRequest.additions.toLocaleString()}
              </motion.span>
            )}
            {pullRequest.deletions !== null && (
              <motion.span
                className="text-rose-600 dark:text-rose-400 font-semibold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                -{pullRequest.deletions.toLocaleString()}
              </motion.span>
            )}
            {pullRequest.changedFiles !== null && (
              <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                <FileCode className="h-3 w-3" />
                <span>{pullRequest.changedFiles}</span>
              </div>
            )}
          </ConnectorCardStats>
        )}

        {/* Comments & Review Stats */}
        {((pullRequest.comments !== null && pullRequest.comments > 0) ||
          (pullRequest.reviewComments !== null && pullRequest.reviewComments > 0)) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {pullRequest.comments !== null && pullRequest.comments > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>
                  {pullRequest.comments} comment{pullRequest.comments === 1 ? "" : "s"}
                </span>
              </div>
            )}
            {pullRequest.reviewComments !== null && pullRequest.reviewComments > 0 && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>
                  {pullRequest.reviewComments} review{pullRequest.reviewComments === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            <Badge
              variant="outline"
              className={cn("text-xs font-medium", stateConfig.bg, stateConfig.color, stateConfig.border)}
            >
              {stateConfig.label}
            </Badge>
            {pullRequest.authorAssociation && pullRequest.authorAssociation !== "NONE" && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs font-medium capitalize",
                  pullRequest.authorAssociation === "OWNER" && "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                  pullRequest.authorAssociation === "CONTRIBUTOR" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                )}
              >
                {pullRequest.authorAssociation.toLowerCase()}
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          {pullRequest.mergedAt ? (
            <ConnectorCardTimestamp>Merged {formatRelativeTime(pullRequest.mergedAt)}</ConnectorCardTimestamp>
          ) : pullRequest.prUpdatedAt ? (
            <ConnectorCardTimestamp>Updated {formatRelativeTime(pullRequest.prUpdatedAt)}</ConnectorCardTimestamp>
          ) : null}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
