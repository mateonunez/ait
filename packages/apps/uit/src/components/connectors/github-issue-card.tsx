import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@ait/core";
import { getEntityDate } from "@ait/core";
import type { GitHubIssueEntity as GitHubIssue } from "@ait/core";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, MessageSquare, Tag, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardDescription,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardHeader,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface GitHubIssueCardProps {
  issue: GitHubIssue;
  onClick?: () => void;
  className?: string;
}

export function GitHubIssueCard({ issue, onClick, className }: GitHubIssueCardProps) {
  const userAvatar = issue.authorData?.avatar_url as string | undefined;
  const userLogin = issue.authorData?.login as string | undefined;

  const getStateConfig = () => {
    if (issue.state === "closed") {
      return {
        icon: CheckCircle2,
        color: "text-purple-600 dark:text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/30",
        label: "Closed",
      };
    }
    return {
      icon: AlertCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      label: "Open",
    };
  };

  const stateConfig = getStateConfig();
  const StateIcon = stateConfig.icon;

  return (
    <ConnectorCardBase service="github" onClick={onClick} externalUrl={issue.htmlUrl} className={className}>
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
              {issue.title}
            </ConnectorCardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">#{issue.number}</span>
              {issue.repositoryFullName && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px] opacity-70">
                    {issue.repositoryFullName}
                  </span>
                </>
              )}
            </div>
          </div>
        </ConnectorCardHeader>

        {/* Body preview */}
        {issue.body && <ConnectorCardDescription className="line-clamp-2">{issue.body}</ConnectorCardDescription>}

        {/* Labels & Comments */}
        {((issue.labelsData && issue.labelsData.length > 0) || (issue.comments !== null && issue.comments > 0)) && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {issue.labelsData && issue.labelsData.length > 0 && (
              <>
                <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
                {issue.labelsData.slice(0, 2).map((label: any, idx: number) => (
                  <motion.div
                    key={label.id || label.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    <Badge variant="secondary" className="text-xs font-medium">
                      {label.name}
                    </Badge>
                  </motion.div>
                ))}
                {issue.labelsData.length > 2 && (
                  <Badge variant="outline" className="text-xs font-medium">
                    +{issue.labelsData.length - 2}
                  </Badge>
                )}
              </>
            )}
            {issue.comments !== null && issue.comments > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <MessageSquare className="h-3 w-3" />
                <span>{issue.comments}</span>
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
            {issue.milestoneData && typeof issue.milestoneData === "object" && (issue.milestoneData as any).title && (
              <Badge variant="secondary" className="text-xs font-medium truncate max-w-[100px]">
                {(issue.milestoneData as any).title}
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          {getEntityDate(issue) && (
            <ConnectorCardTimestamp>
              {issue.state === "closed" ? "Closed " : "Updated "}
              {formatRelativeTime(getEntityDate(issue)!)}
            </ConnectorCardTimestamp>
          )}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
