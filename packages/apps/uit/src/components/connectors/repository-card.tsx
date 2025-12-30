import { formatRelativeTime } from "@/utils/date.utils";
import type { GitHubRepositoryEntity as GitHubRepository } from "@ait/core";
import { motion } from "framer-motion";
import { GitFork, Star, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardDescription,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardHeader,
  ConnectorCardStatItem,
  ConnectorCardStats,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface RepositoryCardProps {
  repository: GitHubRepository;
  onClick?: () => void;
  className?: string;
}

export function RepositoryCard({ repository, onClick, className }: RepositoryCardProps) {
  const ownerAvatar = repository.ownerData?.avatar_url as string | undefined;
  const ownerLogin = repository.ownerData?.login as string | undefined;

  return (
    <ConnectorCardBase service="github" onClick={onClick} externalUrl={repository.url} className={className}>
      <ConnectorCardContent>
        {/* Header with Avatar and Title */}
        <ConnectorCardHeader>
          {ownerAvatar && (
            <Avatar className="h-9 w-9 sm:h-11 sm:w-11 ring-2 ring-border/50 group-hover:ring-blue-500/40 transition-all duration-300 shrink-0">
              <AvatarImage src={ownerAvatar} alt={ownerLogin || "Repository owner"} />
              <AvatarFallback className="bg-slate-800 text-slate-200">
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="github" className="line-clamp-1">
              {repository.name}
            </ConnectorCardTitle>
            {repository.fullName && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono opacity-70">
                {repository.fullName}
              </p>
            )}
          </div>
        </ConnectorCardHeader>

        {/* Description */}
        {repository.description && (
          <ConnectorCardDescription className="line-clamp-2">{repository.description}</ConnectorCardDescription>
        )}

        {/* Stats Row */}
        <ConnectorCardStats>
          <ConnectorCardStatItem
            icon={<Star className="h-3.5 w-3.5 fill-amber-400/30 text-amber-500 dark:text-amber-400" />}
          >
            {repository.stars.toLocaleString()}
          </ConnectorCardStatItem>
          <ConnectorCardStatItem icon={<GitFork className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />}>
            {repository.forks.toLocaleString()}
          </ConnectorCardStatItem>
          {repository.language && (
            <div className="flex items-center gap-1.5 text-muted-foreground ml-auto">
              <motion.span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: getLanguageColor(repository.language),
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              />
              <span className="text-xs font-medium">{repository.language}</span>
            </div>
          )}
        </ConnectorCardStats>

        {/* Footer with metadata */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            {repository.private && (
              <Badge
                variant="outline"
                className="text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
              >
                Private
              </Badge>
            )}
            {repository.fork && (
              <Badge variant="outline" className="text-xs font-medium">
                <GitFork className="h-3 w-3 mr-1" />
                Fork
              </Badge>
            )}
            {repository.archived && (
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-neutral-500/15 text-neutral-600 dark:text-neutral-400"
              >
                Archived
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          {repository.pushedAt && (
            <ConnectorCardTimestamp>Updated {formatRelativeTime(repository.pushedAt)}</ConnectorCardTimestamp>
          )}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}

/**
 * Get color for programming language dot
 */
function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    Java: "#b07219",
    Ruby: "#701516",
    PHP: "#4F5D95",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    Dart: "#00B4AB",
    Vue: "#41b883",
    HTML: "#e34c26",
    CSS: "#563d7c",
    Shell: "#89e051",
    Elixir: "#6e4a7e",
    Haskell: "#5e5086",
    Scala: "#c22d40",
    Lua: "#000080",
  };
  return colors[language] || "#8b8b8b";
}
