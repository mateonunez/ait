import { Calendar, Clock, Globe, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "../ui/badge";
import { cn } from "@/styles/utils";
import {
  ConnectorCardBase,
  ConnectorCardContent,
  ConnectorCardHeader,
  ConnectorCardTitle,
  ConnectorCardDescription,
  ConnectorCardStats,
  ConnectorCardStatItem,
  ConnectorCardFooter,
  ConnectorCardFooterBadges,
} from "./connector-card-base";
import type { GoogleCalendarCalendarEntity as GoogleCalendar } from "@ait/core";

interface CalendarCardProps {
  calendar: GoogleCalendar;
  onClick?: () => void;
  className?: string;
}

export function CalendarCard({ calendar, onClick, className }: CalendarCardProps) {
  const getAccessRoleBadge = () => {
    const role = calendar.accessRole?.toLowerCase();
    if (role === "owner") {
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
    }
    if (role === "writer") {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
    if (role === "reader") {
      return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/30";
    }
    return "bg-muted";
  };

  const backgroundColor = calendar.backgroundColor || "#4285F4";

  return (
    <ConnectorCardBase service="google" onClick={onClick} className={className} showExternalLink={false}>
      <ConnectorCardContent>
        {/* Header with Calendar Icon */}
        <ConnectorCardHeader>
          <motion.div
            className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center shadow-sm ring-2 ring-border/50 group-hover:ring-blue-500/40 transition-all duration-300"
            style={{ backgroundColor }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <ConnectorCardTitle service="google" className="line-clamp-2">
                {calendar.title || "Untitled Calendar"}
              </ConnectorCardTitle>
              {calendar.isPrimary && (
                <Badge
                  variant="outline"
                  className="text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}
            </div>
          </div>
        </ConnectorCardHeader>

        {/* Description */}
        {calendar.description && (
          <ConnectorCardDescription className="line-clamp-2">{calendar.description}</ConnectorCardDescription>
        )}

        {/* Details */}
        <ConnectorCardStats>
          {calendar.timeZone && (
            <ConnectorCardStatItem icon={<Clock className="h-3.5 w-3.5" />}>
              <span className="truncate max-w-[200px]">{calendar.timeZone}</span>
            </ConnectorCardStatItem>
          )}
          {calendar.location && (
            <ConnectorCardStatItem icon={<Globe className="h-3.5 w-3.5 shrink-0" />} className="max-w-[150px]">
              <span className="truncate">{calendar.location}</span>
            </ConnectorCardStatItem>
          )}
        </ConnectorCardStats>

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            {calendar.accessRole && (
              <Badge variant="outline" className={cn("text-xs font-medium capitalize", getAccessRoleBadge())}>
                {calendar.accessRole}
              </Badge>
            )}
            {calendar.isSelected && (
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400"
              >
                Selected
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          <motion.div
            className="w-4 h-4 rounded-full border-2 border-white/50 shadow-sm"
            style={{ backgroundColor }}
            title={`Color: ${backgroundColor}`}
            whileHover={{ scale: 1.2 }}
          />
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
