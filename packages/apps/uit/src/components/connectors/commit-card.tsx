import { formatRelativeTime } from "@ait/core";
import { getEntityDate } from "@ait/core";
import type { GitHubCommitEntity as GitHubCommit } from "@ait/core";
import { motion } from "framer-motion";
import { CheckCircle2, FileCode, GitCommit, User } from "lucide-react";
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

interface CommitCardProps {
  commit: GitHubCommit;
  onClick?: () => void;
  className?: string;
}

export function CommitCard({ commit, onClick, className }: CommitCardProps) {
  const shortSha = commit.sha.substring(0, 7);
  const authorAvatar = commit.authorData?.avatar_url as string | undefined;
  const authorLogin = commit.authorData?.login as string | undefined;
  const fileCount = commit.filesData?.length || 0;

  return (
    <ConnectorCardBase service="github" onClick={onClick} externalUrl={commit.htmlUrl} className={className}>
      <ConnectorCardContent>
        {/* Header with Avatar and Commit Message */}
        <ConnectorCardHeader>
          <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-border/50 group-hover:ring-blue-500/40 transition-all duration-300 shrink-0">
            <AvatarImage src={authorAvatar} alt={authorLogin || "Author"} />
            <AvatarFallback className="bg-slate-800 text-slate-200">
              <User className="h-4 w-4 sm:h-5 sm:w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="github" className="line-clamp-2">
              {commit.message}
            </ConnectorCardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <GitCommit className="h-3 w-3" />
                <code className="font-mono text-xs bg-muted/50 px-1.5 py-0.5 rounded">{shortSha}</code>
              </div>
              {commit.repositoryFullName && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px] font-mono opacity-70">
                    {commit.repositoryFullName}
                  </span>
                </>
              )}
            </div>
          </div>
        </ConnectorCardHeader>

        {/* Commit Body */}
        {commit.messageBody && (
          <ConnectorCardDescription className="line-clamp-2 font-mono text-xs">
            {commit.messageBody}
          </ConnectorCardDescription>
        )}

        {/* Stats */}
        {(commit.additions > 0 || commit.deletions > 0 || fileCount > 0) && (
          <ConnectorCardStats className="font-mono">
            {commit.additions > 0 && (
              <motion.span
                className="text-emerald-600 dark:text-emerald-400 font-semibold"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                +{commit.additions.toLocaleString()}
              </motion.span>
            )}
            {commit.deletions > 0 && (
              <motion.span
                className="text-rose-600 dark:text-rose-400 font-semibold"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                -{commit.deletions.toLocaleString()}
              </motion.span>
            )}
            {fileCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                <FileCode className="h-3 w-3" />
                <span>
                  {fileCount} {fileCount === 1 ? "file" : "files"}
                </span>
              </div>
            )}
          </ConnectorCardStats>
        )}

        {/* Author Info */}
        {commit.authorName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{commit.authorName}</span>
            {commit.authorEmail && <span className="opacity-60 truncate">({commit.authorEmail})</span>}
          </div>
        )}

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            {commit.verification?.verified === true && (
              <Badge
                variant="outline"
                className="text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          {getEntityDate(commit) && (
            <ConnectorCardTimestamp>Committed {formatRelativeTime(getEntityDate(commit)!)}</ConnectorCardTimestamp>
          )}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
