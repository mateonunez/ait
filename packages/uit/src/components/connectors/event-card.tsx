import { Calendar, Clock, MapPin, Users, ExternalLink, Video, Repeat } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/date.utils";
import { cn } from "@/styles/utils";
import type { GoogleCalendarEventEntity as GoogleCalendarEvent } from "@ait/core";

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
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (event.htmlUrl) {
      window.open(event.htmlUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.htmlUrl) {
      window.open(event.htmlUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleMeetingLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (event.hangoutLink) {
      window.open(event.hangoutLink, "_blank", "noopener,noreferrer");
    }
  };

  const getStatusColor = () => {
    const status = event.status?.toLowerCase();
    if (status === "confirmed") {
      return "text-green-600 dark:text-green-400";
    }
    if (status === "tentative") {
      return "text-yellow-600 dark:text-yellow-400";
    }
    if (status === "cancelled") {
      return "text-red-600 dark:text-red-400";
    }
    return "text-muted-foreground";
  };

  const getStatusBadgeColor = () => {
    const status = event.status?.toLowerCase();
    if (status === "confirmed") {
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-600/20";
    }
    if (status === "tentative") {
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-600/20";
    }
    if (status === "cancelled") {
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-600/20";
    }
    return "bg-muted";
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
    const normalized = getNormalizedStartTime();
    if (!normalized) return "";

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
    const startTime = new Date(event.startTime);
    return normalizeEventDate(startTime);
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

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 border-border/50 hover:border-border",
        isPast() && "opacity-60",
        className,
      )}
      onClick={handleClick}
    >
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        {/* Header with Calendar Icon */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div className={cn("shrink-0 pt-0.5", getStatusColor())}>
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {event.title || "Untitled Event"}
              </h3>
              <button
                type="button"
                onClick={handleExternalLinkClick}
                className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:text-foreground focus:outline-none"
                aria-label="Open event in Google Calendar"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formatEventDate()}</p>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Time and Location */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>{formatEventTime()}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1 sm:gap-1.5 max-w-[150px]">
              <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.attendeesCount > 0 && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>
                {event.attendeesCount} attendee{event.attendeesCount > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Meeting Link */}
        {event.hangoutLink && (
          <button
            type="button"
            onClick={handleMeetingLinkClick}
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Video className="h-3 w-3" />
            Join meeting
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs font-normal capitalize", getStatusBadgeColor())}>
              {event.status}
            </Badge>
            {event.recurringEventId && (
              <Badge variant="outline" className="text-xs font-normal">
                <Repeat className="h-3 w-3 mr-1" />
                Recurring
              </Badge>
            )}
            {event.isAllDay && (
              <Badge variant="secondary" className="text-xs font-normal">
                All day
              </Badge>
            )}
          </div>
          {isUpcoming() && getNormalizedStartTime() && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(getNormalizedStartTime()!)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
