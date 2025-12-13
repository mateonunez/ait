import { formatRelativeTime } from "@/utils/date.utils";
import type { GitHubFileEntity as GitHubFile } from "@ait/core";
import { motion } from "framer-motion";
import { Code, FileCode, FolderGit, Hash } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardHeader,
  ConnectorCardStats,
  ConnectorCardTimestamp,
  ConnectorCardTitle,
} from "./connector-card-base";

interface FileCardProps {
  file: GitHubFile;
  onClick?: () => void;
  className?: string;
}

/**
 * Get language color for badge styling
 */
function getLanguageColor(language: string | null): string {
  const colors: Record<string, string> = {
    TypeScript: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    JavaScript: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Python: "bg-green-500/20 text-green-400 border-green-500/30",
    Rust: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Go: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    Java: "bg-red-500/20 text-red-400 border-red-500/30",
    "C#": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Ruby: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    PHP: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
    Shell: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    Markdown: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };
  return colors[language || ""] || "bg-muted text-muted-foreground";
}

export function FileCard({ file, onClick, className }: FileCardProps) {
  const fileName = file.name || file.path.split("/").pop() || "unknown";
  const directory = file.path.includes("/") ? file.path.substring(0, file.path.lastIndexOf("/")) : "";
  const shortSha = file.sha?.substring(0, 7) || "";

  return (
    <ConnectorCardBase service="github" onClick={onClick} className={className}>
      <ConnectorCardContent>
        {/* Header with File Icon and Name */}
        <ConnectorCardHeader>
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-800 ring-2 ring-border/50 group-hover:ring-blue-500/40 transition-all duration-300 shrink-0">
            <FileCode className="h-5 w-5 text-slate-200" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="github" className="font-mono text-sm">
              {fileName}
            </ConnectorCardTitle>
            {directory && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <FolderGit className="h-3 w-3" />
                <span className="truncate font-mono opacity-70">{directory}</span>
              </div>
            )}
          </div>
        </ConnectorCardHeader>

        {/* Repository Context */}
        {file.repositoryFullName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Code className="h-3 w-3" />
            <span className="font-mono truncate">{file.repositoryFullName}</span>
            {file.branch && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="font-mono opacity-70">{file.branch}</span>
              </>
            )}
          </div>
        )}

        {/* Stats */}
        <ConnectorCardStats className="font-mono">
          {file.linesOfCode > 0 && (
            <motion.div
              className="flex items-center gap-1 text-muted-foreground"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Hash className="h-3 w-3" />
              <span>{file.linesOfCode.toLocaleString()} lines</span>
            </motion.div>
          )}
          {file.size > 0 && (
            <motion.div
              className="text-muted-foreground ml-auto"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              {file.size >= 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} bytes`}
            </motion.div>
          )}
        </ConnectorCardStats>

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            {file.language && (
              <Badge variant="outline" className={`text-xs font-medium ${getLanguageColor(file.language)}`}>
                {file.language}
              </Badge>
            )}
            {file.extension && !file.language && (
              <Badge variant="outline" className="text-xs font-medium">
                {file.extension}
              </Badge>
            )}
            {shortSha && (
              <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                {shortSha}
              </code>
            )}
          </ConnectorCardFooterBadges>
          {file.updatedAt && <ConnectorCardTimestamp>{formatRelativeTime(file.updatedAt)}</ConnectorCardTimestamp>}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
