import { Calendar, Clock, Globe, Check } from "lucide-react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "@/styles/utils";
import type { GoogleCalendarCalendarEntity as GoogleCalendar } from "@ait/core";

interface CalendarCardProps {
  calendar: GoogleCalendar;
  onClick?: () => void;
  className?: string;
}

export function CalendarCard({ calendar, onClick, className }: CalendarCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const getAccessRoleBadge = () => {
    const role = calendar.accessRole?.toLowerCase();
    if (role === "owner") {
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-600/20";
    }
    if (role === "writer") {
      return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-600/20";
    }
    if (role === "reader") {
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-600/20";
    }
    return "bg-muted";
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
        {/* Header with Calendar Icon */}
        <div className="flex items-start gap-2 sm:gap-3">
          <div
            className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: calendar.backgroundColor || "#4285F4" }}
          >
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {calendar.title || "Untitled Calendar"}
              </h3>
              {calendar.isPrimary && (
                <Badge
                  variant="outline"
                  className="text-xs font-normal bg-blue-500/10 text-blue-600 dark:text-blue-400"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Primary
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {calendar.description && (
          <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-2 leading-relaxed">
            {calendar.description}
          </p>
        )}

        {/* Details */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-muted-foreground">
          {calendar.timeZone && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{calendar.timeZone}</span>
            </div>
          )}
          {calendar.location && (
            <div className="flex items-center gap-1 sm:gap-1.5 max-w-[150px]">
              <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">{calendar.location}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/40 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {calendar.accessRole && (
              <Badge variant="outline" className={cn("text-xs font-normal capitalize", getAccessRoleBadge())}>
                {calendar.accessRole}
              </Badge>
            )}
            {calendar.isSelected && (
              <Badge variant="secondary" className="text-xs font-normal">
                Selected
              </Badge>
            )}
          </div>
          <div
            className="w-4 h-4 rounded-full border-2 border-white/50"
            style={{ backgroundColor: calendar.backgroundColor || "#4285F4" }}
            title={`Color: ${calendar.backgroundColor}`}
          />
        </div>
      </div>
    </Card>
  );
}
