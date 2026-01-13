import { cn } from "@/styles/utils";
import { formatRelativeTime } from "@ait/core";
import type { GoogleCalendarEventEntity as GoogleCalendarEvent } from "@ait/core";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, CheckCircle2, Clock, MapPin, Repeat, Users, Video, XCircle } from "lucide-react";
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

function normalizeEventDate(date: Date): Date {
  const now = new Date();
  const yearsDiff = Math.abs(date.getFullYear() - now.getFullYear());

  if (yearsDiff <= 1) return date;

  const normalized = new Date(date);
  normalized.setFullYear(now.getFullYear());

  if (normalized < now) {
    normalized.setFullYear(now.getFullYear() + 1);
  }

  return normalized;
}

interface EventCardProps {
  event: GoogleCalendarEvent;
  onClick?: () => void;
  className?: string;
}

export function EventCard({ event, onClick, className }: EventCardProps) {
  const getStatusConfig = () => {
    const status = event.status?.toLowerCase();
    if (status === "confirmed") {
      return {
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
      };
    }
    if (status === "tentative") {
      return {
        icon: AlertCircle,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
      };
    }
    if (status === "cancelled") {
      return {
        icon: XCircle,
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
      };
    }
    return {
      icon: Calendar,
      color: "text-muted-foreground",
      bg: "bg-muted",
      border: "border-border",
    };
  };

  const formatEventTime = () => {
    if (!event.startTime) return "No time set";

    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : null;

    if (event.isAllDay) {
      return "All day";
    }

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    const startStr = start.toLocaleTimeString("en-US", timeOptions);
    const endStr = end ? end.toLocaleTimeString("en-US", timeOptions) : "";

    return end ? `${startStr} - ${endStr}` : startStr;
  };

  const formatEventDate = () => {
    if (!event.startTime) return "";
    const normalized = normalizeEventDate(new Date(event.startTime));
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (normalized.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (normalized.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }

    return normalized.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getNormalizedStartTime = () => {
    if (!event.startTime) return null;
    return normalizeEventDate(new Date(event.startTime));
  };

  const isUpcoming = () => {
    const normalized = getNormalizedStartTime();
    if (!normalized) return false;
    return normalized > new Date();
  };

  const isPast = () => {
    if (!event.endTime && !event.startTime) return false;
    const endOrStart = event.endTime ? new Date(event.endTime) : new Date(event.startTime!);
    const normalized = normalizeEventDate(endOrStart);
    return normalized < new Date();
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <ConnectorCardBase
      service="google"
      onClick={onClick}
      externalUrl={event.htmlUrl}
      className={cn(className, isPast() && "opacity-60")}
    >
      <ConnectorCardContent>
        {/* Header with Calendar Icon */}
        <ConnectorCardHeader>
          <div className={cn("shrink-0 pt-0.5", statusConfig.color)}>
            <StatusIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <ConnectorCardTitle service="google" className="line-clamp-2">
              {event.title || "Untitled Event"}
            </ConnectorCardTitle>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{formatEventDate()}</p>
          </div>
        </ConnectorCardHeader>

        {/* Description */}
        {event.description && (
          <ConnectorCardDescription className="line-clamp-2">{event.description}</ConnectorCardDescription>
        )}

        {/* Time and Location */}
        <ConnectorCardStats>
          <ConnectorCardStatItem icon={<Clock className="h-3.5 w-3.5" />}>{formatEventTime()}</ConnectorCardStatItem>
          {event.location && (
            <ConnectorCardStatItem icon={<MapPin className="h-3.5 w-3.5 shrink-0" />} className="max-w-[150px]">
              <span className="truncate">{event.location}</span>
            </ConnectorCardStatItem>
          )}
          {event.attendeesCount > 0 && (
            <ConnectorCardStatItem icon={<Users className="h-3.5 w-3.5" />}>
              {event.attendeesCount} attendee{event.attendeesCount > 1 ? "s" : ""}
            </ConnectorCardStatItem>
          )}
        </ConnectorCardStats>

        {/* Meeting Link */}
        {event.hangoutLink && (
          <motion.a
            href={event.hangoutLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Video className="h-3 w-3" />
            Join meeting
          </motion.a>
        )}

        {/* Footer */}
        <ConnectorCardFooter>
          <ConnectorCardFooterBadges>
            <Badge
              variant="outline"
              className={cn("text-xs font-medium capitalize", statusConfig.bg, statusConfig.color, statusConfig.border)}
            >
              {event.status}
            </Badge>
            {event.recurringEventId && (
              <Badge
                variant="outline"
                className="text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
              >
                <Repeat className="h-3 w-3 mr-1" />
                Recurring
              </Badge>
            )}
            {event.isAllDay && (
              <Badge
                variant="secondary"
                className="text-xs font-medium bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"
              >
                All day
              </Badge>
            )}
          </ConnectorCardFooterBadges>
          {isUpcoming() && getNormalizedStartTime() && (
            <ConnectorCardTimestamp>{formatRelativeTime(getNormalizedStartTime()!)}</ConnectorCardTimestamp>
          )}
        </ConnectorCardFooter>
      </ConnectorCardContent>
    </ConnectorCardBase>
  );
}
