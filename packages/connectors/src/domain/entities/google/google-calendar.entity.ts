import "reflect-metadata";
import type { GoogleCalendarCalendarExternal, GoogleCalendarEventExternal } from "@ait/core";
import type { GoogleCalendarCalendarDataTarget, GoogleCalendarEventDataTarget } from "@ait/postgres";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";

/**
 * Google Calendar Event entity with class-transformer decorators.
 */
export class GoogleCalendarEventEntity {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ value }) => value ?? "Untitled Event")
  title!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  description!: string | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  startTime!: Date | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  endTime!: Date | null;

  @Expose()
  @Transform(({ value }) => value ?? false)
  isAllDay!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? null)
  timeZone!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  location!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? "confirmed")
  status!: string;

  @Expose()
  @Transform(({ value }) => value ?? "")
  htmlUrl!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  colorId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? "default")
  visibility!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? "opaque")
  transparency!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  iCalUid!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  sequence!: number | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  calendarId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  recurringEventId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? "default")
  eventType!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  hangoutLink!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? false)
  anyoneCanAddSelf!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? true)
  guestsCanInviteOthers!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  guestsCanModify!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? true)
  guestsCanSeeOtherGuests!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  privateCopy!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  locked!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  attendeesOmitted!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? 0)
  attendeesCount!: number;

  @Expose()
  @Transform(({ value }) => value ?? null)
  creatorData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  organizerData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  attendeesData!: any[] | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  recurrenceData!: string[] | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  remindersData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  conferenceData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  attachmentsData!: any[] | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  extendedPropertiesData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  metadata!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  eventCreatedAt!: Date | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : null))
  eventUpdatedAt!: Date | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "event" as const;
}

/**
 * Google Calendar entity with class-transformer decorators.
 */
export class GoogleCalendarCalendarEntity {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ value }) => value ?? "Untitled Calendar")
  title!: string;

  @Expose()
  @Transform(({ value }) => value ?? null)
  description!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  location!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  timeZone!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  colorId!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  backgroundColor!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  foregroundColor!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? "reader")
  accessRole!: string | null;

  @Expose()
  @Transform(({ value }) => value ?? false)
  isPrimary!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  isHidden!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? true)
  isSelected!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? false)
  isDeleted!: boolean;

  @Expose()
  @Transform(({ value }) => value ?? null)
  defaultRemindersData!: any[] | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  notificationSettingsData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  conferencePropertiesData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => value ?? null)
  metadata!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  readonly __type = "calendar" as const;
}

/**
 * Transform external Google Calendar event to domain entity.
 */
export function mapGoogleCalendarEvent(
  external: GoogleCalendarEventExternal,
  calendarId?: string,
): GoogleCalendarEventEntity {
  const mapped = {
    ...external,
    title: external.summary ?? "Untitled Event",
    startTime: external.start?.dateTime ?? external.start?.date ?? null,
    endTime: external.end?.dateTime ?? external.end?.date ?? null,
    isAllDay: !!external.start?.date && !external.start?.dateTime,
    timeZone: external.start?.timeZone ?? null,
    htmlUrl: external.htmlLink,
    iCalUid: external.iCalUID ?? null,
    calendarId: calendarId ?? null,
    recurringEventId: external.recurringEventId ?? null,
    attendeesCount: external.attendees?.length ?? 0,
    creatorData: external.creator ?? null,
    organizerData: external.organizer ?? null,
    attendeesData: external.attendees ?? null,
    recurrenceData: external.recurrence ?? null,
    remindersData: external.reminders ?? null,
    conferenceData: external.conferenceData ?? null,
    attachmentsData: external.attachments ?? null,
    extendedPropertiesData: external.extendedProperties ?? null,
    eventCreatedAt: external.created ?? null,
    eventUpdatedAt: external.updated ?? null,
  };

  return plainToInstance(GoogleCalendarEventEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

/**
 * Transform external Google Calendar calendar to domain entity.
 */
export function mapGoogleCalendarCalendar(external: GoogleCalendarCalendarExternal): GoogleCalendarCalendarEntity {
  const mapped = {
    ...external,
    title: external.summaryOverride ?? external.summary ?? "Untitled Calendar",
    isPrimary: external.primary ?? false,
    isHidden: external.hidden ?? false,
    isSelected: external.selected ?? true,
    isDeleted: external.deleted ?? false,
    defaultRemindersData: external.defaultReminders ?? null,
    notificationSettingsData: external.notificationSettings ?? null,
    conferencePropertiesData: external.conferenceProperties ?? null,
  };

  return plainToInstance(GoogleCalendarCalendarEntity, mapped, {
    excludeExtraneousValues: true,
  });
}

// --- Domain ↔ DataTarget (DB) using class-transformer ---

export function googleCalendarEventDomainToDataTarget(
  domain: GoogleCalendarEventEntity,
): GoogleCalendarEventDataTarget {
  return instanceToPlain(domain) as GoogleCalendarEventDataTarget;
}

export function googleCalendarEventDataTargetToDomain(
  dataTarget: GoogleCalendarEventDataTarget,
): GoogleCalendarEventEntity {
  return plainToInstance(GoogleCalendarEventEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}

export function googleCalendarCalendarDomainToDataTarget(
  domain: GoogleCalendarCalendarEntity,
): GoogleCalendarCalendarDataTarget {
  return instanceToPlain(domain) as GoogleCalendarCalendarDataTarget;
}

export function googleCalendarCalendarDataTargetToDomain(
  dataTarget: GoogleCalendarCalendarDataTarget,
): GoogleCalendarCalendarEntity {
  return plainToInstance(GoogleCalendarCalendarEntity, dataTarget, {
    excludeExtraneousValues: false,
  });
}
