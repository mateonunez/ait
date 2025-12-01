import type { GoogleCalendarCalendarEntity, GoogleCalendarEventEntity } from "@ait/core";
import { TextNormalizationService } from "../../metadata/text-normalization.service";
import type { EntityFormatter } from "./formatter.utils";
import { safeString } from "./formatter.utils";

const textNormalizer = new TextNormalizationService();

const formatEventDate = (date: Date, isAllDay: boolean): string => {
  if (isAllDay) {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const GoogleCalendarEventFormatter: EntityFormatter<GoogleCalendarEventEntity> = {
  format: (meta) => {
    const title = safeString(meta.title, "Untitled Event");
    const description = safeString(meta.description);
    const location = safeString(meta.location);
    const status = safeString(meta.status);

    const parts: string[] = [];
    parts.push(`Calendar event: ${title}`);

    if (meta.startTime) {
      const startDate = new Date(meta.startTime);
      parts.push(` on ${formatEventDate(startDate, meta.isAllDay || false)}`);
    }

    if (location) {
      parts.push(` at ${location}`);
    }

    if (meta.attendeesCount && meta.attendeesCount > 0) {
      parts.push(` with ${meta.attendeesCount} attendee${meta.attendeesCount > 1 ? "s" : ""}`);
    }

    if (status && status !== "confirmed") {
      parts.push(` [${status}]`);
    }

    if (description) {
      parts.push(` - ${textNormalizer.truncate(description, 150)}`);
    }

    return parts.join("");
  },
};

export const GoogleCalendarCalendarFormatter: EntityFormatter<GoogleCalendarCalendarEntity> = {
  format: (meta) => {
    const title = safeString(meta.title, "Untitled Calendar");
    const description = safeString(meta.description);
    const timeZone = safeString(meta.timeZone);

    const parts: string[] = [];
    parts.push(`Calendar: ${title}`);

    if (meta.isPrimary) {
      parts.push(" [Primary]");
    }

    if (timeZone) {
      parts.push(` (${timeZone})`);
    }

    if (description) {
      parts.push(` - ${textNormalizer.truncate(description, 100)}`);
    }

    return parts.join("");
  },
};
