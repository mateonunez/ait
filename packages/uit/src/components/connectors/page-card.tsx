import { FileText, Archive } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardHeader,
  ConnectorCardTitle,
  ConnectorCardDescription,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
  ConnectorCardTimestamp,
} from "./connector-card-base";
import type { NotionPageEntity as NotionPage } from "@ait/core";

interface PageCardProps {
  page: NotionPage;
  onClick?: () => void;
  className?: string;
}

export function PageCard({ page, onClick, className }: PageCardProps) {
  const isEmoji = (icon: string | null): boolean => {
    if (!icon) return false;
    return icon.length <= 2 || /^[\p{Emoji}]/u.test(icon);
  };

  const getIconDisplay = () => {
    if (!page.icon) {
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    }

    if (isEmoji(page.icon)) {
      return <span className="text-2xl">{page.icon}</span>;
    }

    return <img src={page.icon} alt="" className="h-5 w-5 object-contain rounded" />;
  };

  return (
    <ConnectorCardBase service="notion" onClick={onClick} externalUrl={page.url} className={className}>
      {page.cover && (
        <motion.div
          className="h-24 sm:h-32 w-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <img src={page.cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        </motion.div>
      )}
      <ConnectorCardContent className={cn(page.cover && "pt-3 sm:pt-4")}>
        {/* Header with Icon and Title */}
        <ConnectorCardHeader>
          <motion.div
            className="flex-shrink-0 pt-0.5"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            {getIconDisplay()}
          </motion.div>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="notion" className="line-clamp-2">
              {page.title}
            </ConnectorCardTitle>
            {page.parentType && page.parentType !== "workspace" && (
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                {page.parentType === "database_id" ? "In database" : "In page"}
              </p>
            )}
          </div>
        </ConnectorCardHeader>

        {/* Content Preview */}
        {page.content && <ConnectorCardDescription className="line-clamp-3">{page.content}</ConnectorCardDescription>}

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            {page.archived && (
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"
              >
                <Archive className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                Archived
              </Badge>
            )}
            {page.parentType && (
              <Badge variant="outline" className="text-xs font-medium capitalize">
                {page.parentType.replace("_id", "").replace("_", " ")}
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          {page.updatedAt && (
            <ConnectorCardTimestamp>Updated {formatRelativeTime(page.updatedAt)}</ConnectorCardTimestamp>
          )}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
