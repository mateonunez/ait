import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@ait/core";
import { getEntityDate } from "@ait/core";
import type { LinearIssueEntity as LinearIssue } from "@ait/core";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Circle, Tag, User, Zap } from "lucide-react";
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

interface IssueCardProps {
  issue: LinearIssue;
  onClick?: () => void;
  className?: string;
}

export function IssueCard({ issue, onClick, className }: IssueCardProps) {
  const getStateConfig = () => {
    const state = issue.state.toLowerCase();
    if (state.includes("done") || state.includes("completed")) {
      return {
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
      };
    }
    if (state.includes("progress") || state.includes("started")) {
      return {
        icon: AlertCircle,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
      };
    }
    return {
      icon: Circle,
      color: "text-muted-foreground",
      bg: "bg-muted",
      border: "border-border",
    };
  };

  const getPriorityConfig = () => {
    if (issue.priority === null) {
      return {
        label: "No Priority",
        color: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/30",
        icon: Circle,
      };
    }
    if (issue.priority >= 1) {
      return {
        label: "Urgent",
        color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        icon: Zap,
      };
    }
    if (issue.priority >= 2) {
      return {
        label: "High",
        color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
        icon: AlertCircle,
      };
    }
    if (issue.priority >= 3) {
      return {
        label: "Medium",
        color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        icon: Circle,
      };
    }
    return {
      label: "Low",
      color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
      icon: Circle,
    };
  };

  const stateConfig = getStateConfig();
  const StateIcon = stateConfig.icon;
  const priorityConfig = getPriorityConfig();
  const PriorityIcon = priorityConfig.icon;

  return (
    <ConnectorCardBase service="linear" onClick={onClick} externalUrl={issue.url} className={className}>
      <ConnectorCardContent>
        {/* Header with State Icon */}
        <ConnectorCardHeader>
          <motion.div
            className={cn("flex-shrink-0 pt-0.5", stateConfig.color)}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <StateIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.div>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="linear" className="line-clamp-2">
              {issue.title}
            </ConnectorCardTitle>
            {issue.teamName && <p className="text-xs text-muted-foreground mt-1 font-medium">{issue.teamName}</p>}
          </div>
        </ConnectorCardHeader>

        {/* Description */}
        {issue.description && (
          <ConnectorCardDescription className="line-clamp-2">{issue.description}</ConnectorCardDescription>
        )}

        {/* Labels & Assignee */}
        {(issue.labels && issue.labels.length > 0) || issue.assigneeName ? (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {issue.labels && issue.labels.length > 0 && (
              <>
                <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
                {issue.labels.slice(0, 2).map((label, idx) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    <Badge variant="secondary" className="text-xs font-medium">
                      {label}
                    </Badge>
                  </motion.div>
                ))}
                {issue.labels.length > 2 && (
                  <Badge variant="outline" className="text-xs font-medium">
                    +{issue.labels.length - 2}
                  </Badge>
                )}
              </>
            )}
            {issue.assigneeName && (
              <motion.div
                className="flex items-center gap-1 sm:gap-1.5 text-xs text-muted-foreground ml-auto"
                whileHover={{ scale: 1.05 }}
              >
                <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="truncate font-medium">{issue.assigneeName}</span>
              </motion.div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            <Badge variant="outline" className={cn("text-xs font-medium", priorityConfig.color)}>
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priorityConfig.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-xs font-medium capitalize", stateConfig.bg, stateConfig.color, stateConfig.border)}
            >
              {issue.state}
            </Badge>
          </ConnectorCardFooterBadges>
          {getEntityDate(issue) && (
            <ConnectorCardTimestamp>Updated {formatRelativeTime(getEntityDate(issue)!)}</ConnectorCardTimestamp>
          )}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
