import { Circle, AlertCircle, CheckCircle2, ExternalLink, User, Tag } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { LinearIssueEntity as LinearIssue } from "@ait/core";

interface IssueCardProps {
  issue: LinearIssue;
  onClick?: () => void;
  className?: string;
}

export function IssueCard({ issue, onClick, className }: IssueCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (issue.url) {
      window.open(issue.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (issue.url) {
      window.open(issue.url, "_blank", "noopener,noreferrer");
    }
  };

  const getStateIcon = () => {
    const state = issue.state.toLowerCase();
    if (state.includes("done") || state.includes("completed")) {
      return <CheckCircle2 className="h-5 w-5" />;
    }
    if (state.includes("progress") || state.includes("started")) {
      return <AlertCircle className="h-5 w-5" />;
    }
    return <Circle className="h-5 w-5" />;
  };

  const getStateColor = () => {
    const state = issue.state.toLowerCase();
    if (state.includes("done") || state.includes("completed")) {
      return "text-green-600 dark:text-green-400";
    }
    if (state.includes("progress") || state.includes("started")) {
      return "text-blue-600 dark:text-blue-400";
    }
    return "text-muted-foreground";
  };

  const getPriorityColor = () => {
    if (issue.priority === null) return "bg-muted";
    if (issue.priority >= 1) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-600/20";
    if (issue.priority >= 2) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-600/20";
    if (issue.priority >= 3) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-600/20";
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-600/20";
  };

  const getPriorityLabel = () => {
    if (issue.priority === null) return "No Priority";
    if (issue.priority >= 1) return "Urgent";
    if (issue.priority >= 2) return "High";
    if (issue.priority >= 3) return "Medium";
    return "Low";
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
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header with State Icon */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className={cn("flex-shrink-0 pt-0.5", getStateColor())}>
            <div className="h-4 w-4 sm:h-5 sm:w-5">{getStateIcon()}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {issue.title}
              </h3>
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open issue in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            {issue.teamName && <p className="text-xs text-muted-foreground mt-1">{issue.teamName}</p>}
          </div>
        </div>

        {/* Description */}
        {issue.description && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
            {issue.description}
          </p>
        )}

        {/* Labels & Assignee */}
        {(issue.labels && issue.labels.length > 0) ||
          (issue.assigneeName && (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {issue.labels && issue.labels.length > 0 && (
                <>
                  <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
                  {issue.labels.slice(0, 2).map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs font-normal">
                      {label}
                    </Badge>
                  ))}
                  {issue.labels.length > 2 && (
                    <Badge variant="outline" className="text-xs font-normal">
                      +{issue.labels.length - 2}
                    </Badge>
                  )}
                </>
              )}
              {issue.assigneeName && (
                <div className="flex items-center gap-1 sm:gap-1.5 text-xs text-muted-foreground ml-auto">
                  <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="truncate">{issue.assigneeName}</span>
                </div>
              )}
            </div>
          ))}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs font-normal", getPriorityColor())}>
              {getPriorityLabel()}
            </Badge>
            <Badge variant="outline" className={cn("text-xs font-normal capitalize", getStateColor())}>
              {issue.state}
            </Badge>
          </div>
          {issue.updatedAt && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Updated {formatRelativeTime(issue.updatedAt)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
