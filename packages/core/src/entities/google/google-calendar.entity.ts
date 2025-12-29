import "reflect-metadata";
import { Expose, Transform, instanceToPlain, plainToInstance } from "class-transformer";
import type { GoogleCalendarCalendarExternal, GoogleCalendarEventExternal } from "../../types/integrations";

/**
 * Google Calendar Event entity with class-transformer decorators.
 */
export class GoogleCalendarEventEntity {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? "Untitled Event")
  title!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  description!: string | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : null))
  startTime!: Date | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : null))
  endTime!: Date | null;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  isAllDay!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  timeZone!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  location!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? "confirmed")
  status!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? "")
  htmlUrl!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  colorId!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? "default")
  visibility!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? "opaque")
  transparency!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  iCalUid!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  sequence!: number | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  calendarId!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  recurringEventId!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? "default")
  eventType!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  hangoutLink!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  anyoneCanAddSelf!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? true)
  guestsCanInviteOthers!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  guestsCanModify!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? true)
  guestsCanSeeOtherGuests!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  privateCopy!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  locked!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  attendeesOmitted!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? 0)
  attendeesCount!: number;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  creatorData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  organizerData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  attendeesData!: any[] | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  recurrenceData!: string[] | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  remindersData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  conferenceData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  attachmentsData!: any[] | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  extendedPropertiesData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  metadata!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : null))
  eventCreatedAt!: Date | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : null))
  eventUpdatedAt!: Date | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "google_calendar_event" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GoogleCalendarEventEntity {
    return plainToInstance(GoogleCalendarEventEntity, data, { excludeExtraneousValues: false });
  }
}

/**
 * Google Calendar entity with class-transformer decorators.
 */
export class GoogleCalendarCalendarEntity {
  @Expose()
  id!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? "Untitled Calendar")
  title!: string;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  description!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  location!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  timeZone!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  colorId!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  backgroundColor!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  foregroundColor!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? "reader")
  accessRole!: string | null;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  isPrimary!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  isHidden!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? true)
  isSelected!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? false)
  isDeleted!: boolean;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  defaultRemindersData!: any[] | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  notificationSettingsData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  conferencePropertiesData!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => value ?? null)
  metadata!: Record<string, unknown> | null;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  createdAt!: Date;

  @Expose()
  @Transform(({ value }: any) => (value ? new Date(value) : new Date()))
  updatedAt!: Date;

  @Expose()
  readonly __type = "google_calendar_calendar" as const;

  toPlain<T = Record<string, unknown>>(): T {
    return instanceToPlain(this) as T;
  }

  static fromPlain<T extends Record<string, unknown>>(data: T): GoogleCalendarCalendarEntity {
    return plainToInstance(GoogleCalendarCalendarEntity, data, { excludeExtraneousValues: false });
  }
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
    description: external.description ?? null,
    location: external.location ?? null,
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
    exposeDefaultValues: true,
  });
}

/**
 * Transform external Google Calendar calendar to domain entity.
 */
export function mapGoogleCalendarCalendar(external: GoogleCalendarCalendarExternal): GoogleCalendarCalendarEntity {
  const mapped = {
    ...external,
    title: external.summaryOverride ?? external.summary ?? "Untitled Calendar",
    description: external.description ?? null,
    location: external.location ?? null,
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
    exposeDefaultValues: true,
  });
}
