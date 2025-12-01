import type {
  GoogleCalendarCalendarEntity,
  GoogleCalendarCalendarExternal,
  GoogleCalendarEventEntity,
  GoogleCalendarEventExternal,
} from "@ait/core";
import type { GoogleCalendarCalendarDataTarget, GoogleCalendarEventDataTarget } from "@ait/postgres";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";

const googleCalendarEventMapping: ConnectorMapperDefinition<
  GoogleCalendarEventExternal,
  GoogleCalendarEventEntity,
  GoogleCalendarEventDataTarget
> = {
  id: connectorMapperPassThrough<
    "id",
    string,
    GoogleCalendarEventExternal,
    GoogleCalendarEventEntity,
    GoogleCalendarEventDataTarget
  >("id"),

  title: {
    external: (ext) => ext.summary || "",
    domain: (dom) => dom.title,
    dataTarget: (dt) => dt.title,
  },

  description: {
    external: (ext) => ext.description ?? null,
    domain: (dom) => dom.description,
    dataTarget: (dt) => dt.description ?? null,
  },

  startTime: {
    external: (ext) => {
      if (ext.start?.dateTime) {
        return new Date(ext.start.dateTime);
      }
      if (ext.start?.date) {
        return new Date(ext.start.date);
      }
      return null;
    },
    domain: (dom) => dom.startTime,
    dataTarget: (dt) => dt.startTime ?? null,
  },

  endTime: {
    external: (ext) => {
      if (ext.end?.dateTime) {
        return new Date(ext.end.dateTime);
      }
      if (ext.end?.date) {
        return new Date(ext.end.date);
      }
      return null;
    },
    domain: (dom) => dom.endTime,
    dataTarget: (dt) => dt.endTime ?? null,
  },

  isAllDay: {
    external: (ext) => !ext.start?.dateTime && !!ext.start?.date,
    domain: (dom) => dom.isAllDay,
    dataTarget: (dt) => dt.isAllDay ?? false,
  },

  timeZone: {
    external: (ext) => ext.start?.timeZone ?? null,
    domain: (dom) => dom.timeZone,
    dataTarget: (dt) => dt.timeZone ?? null,
  },

  location: {
    external: (ext) => ext.location ?? null,
    domain: (dom) => dom.location,
    dataTarget: (dt) => dt.location ?? null,
  },

  status: connectorMapperPassThrough<
    "status",
    string,
    GoogleCalendarEventExternal,
    GoogleCalendarEventEntity,
    GoogleCalendarEventDataTarget
  >("status"),

  htmlUrl: {
    external: (ext) => ext.htmlLink,
    domain: (dom) => dom.htmlUrl,
    dataTarget: (dt) => dt.htmlUrl,
  },

  colorId: {
    external: (ext) => ext.colorId ?? null,
    domain: (dom) => dom.colorId,
    dataTarget: (dt) => dt.colorId ?? null,
  },

  visibility: {
    external: (ext) => ext.visibility ?? null,
    domain: (dom) => dom.visibility,
    dataTarget: (dt) => dt.visibility ?? null,
  },

  transparency: {
    external: (ext) => ext.transparency ?? null,
    domain: (dom) => dom.transparency,
    dataTarget: (dt) => dt.transparency ?? null,
  },

  iCalUid: {
    external: (ext) => ext.iCalUID ?? null,
    domain: (dom) => dom.iCalUid,
    dataTarget: (dt) => dt.iCalUid ?? null,
  },

  sequence: {
    external: (ext) => ext.sequence ?? null,
    domain: (dom) => dom.sequence,
    dataTarget: (dt) => dt.sequence ?? null,
  },

  calendarId: {
    external: () => null, // Set externally after fetch
    domain: (dom) => dom.calendarId,
    dataTarget: (dt) => dt.calendarId ?? null,
  },

  recurringEventId: {
    external: (ext) => ext.recurringEventId ?? null,
    domain: (dom) => dom.recurringEventId,
    dataTarget: (dt) => dt.recurringEventId ?? null,
  },

  eventType: {
    external: (ext) => ext.eventType ?? null,
    domain: (dom) => dom.eventType,
    dataTarget: (dt) => dt.eventType ?? null,
  },

  hangoutLink: {
    external: (ext) => ext.hangoutLink ?? null,
    domain: (dom) => dom.hangoutLink,
    dataTarget: (dt) => dt.hangoutLink ?? null,
  },

  anyoneCanAddSelf: {
    external: (ext) => ext.anyoneCanAddSelf ?? false,
    domain: (dom) => dom.anyoneCanAddSelf,
    dataTarget: (dt) => dt.anyoneCanAddSelf ?? false,
  },

  guestsCanInviteOthers: {
    external: (ext) => ext.guestsCanInviteOthers ?? true,
    domain: (dom) => dom.guestsCanInviteOthers,
    dataTarget: (dt) => dt.guestsCanInviteOthers ?? true,
  },

  guestsCanModify: {
    external: (ext) => ext.guestsCanModify ?? false,
    domain: (dom) => dom.guestsCanModify,
    dataTarget: (dt) => dt.guestsCanModify ?? false,
  },

  guestsCanSeeOtherGuests: {
    external: (ext) => ext.guestsCanSeeOtherGuests ?? true,
    domain: (dom) => dom.guestsCanSeeOtherGuests,
    dataTarget: (dt) => dt.guestsCanSeeOtherGuests ?? true,
  },

  privateCopy: {
    external: (ext) => ext.privateCopy ?? false,
    domain: (dom) => dom.privateCopy,
    dataTarget: (dt) => dt.privateCopy ?? false,
  },

  locked: {
    external: (ext) => ext.locked ?? false,
    domain: (dom) => dom.locked,
    dataTarget: (dt) => dt.locked ?? false,
  },

  attendeesOmitted: {
    external: (ext) => ext.attendeesOmitted ?? false,
    domain: (dom) => dom.attendeesOmitted,
    dataTarget: (dt) => dt.attendeesOmitted ?? false,
  },

  attendeesCount: {
    external: (ext) => ext.attendees?.length ?? 0,
    domain: (dom) => dom.attendeesCount,
    dataTarget: (dt) => dt.attendeesCount ?? 0,
  },

  creatorData: {
    external: (ext) => (ext.creator ? ({ ...ext.creator } as Record<string, unknown>) : null),
    domain: (dom) => dom.creatorData,
    dataTarget: (dt) => (dt.creatorData as Record<string, unknown> | null) ?? null,
  },

  organizerData: {
    external: (ext) => (ext.organizer ? ({ ...ext.organizer } as Record<string, unknown>) : null),
    domain: (dom) => dom.organizerData,
    dataTarget: (dt) => (dt.organizerData as Record<string, unknown> | null) ?? null,
  },

  attendeesData: {
    external: (ext) => (ext.attendees ? (ext.attendees as Array<Record<string, unknown>>) : null),
    domain: (dom) => dom.attendeesData,
    dataTarget: (dt) => (dt.attendeesData as Array<Record<string, unknown>> | null) ?? null,
  },

  recurrenceData: {
    external: (ext) => ext.recurrence ?? null,
    domain: (dom) => dom.recurrenceData,
    dataTarget: (dt) => (dt.recurrenceData as string[] | null) ?? null,
  },

  remindersData: {
    external: (ext) => (ext.reminders ? ({ ...ext.reminders } as Record<string, unknown>) : null),
    domain: (dom) => dom.remindersData,
    dataTarget: (dt) => (dt.remindersData as Record<string, unknown> | null) ?? null,
  },

  conferenceData: {
    external: (ext) => (ext.conferenceData ? ({ ...ext.conferenceData } as Record<string, unknown>) : null),
    domain: (dom) => dom.conferenceData,
    dataTarget: (dt) => (dt.conferenceData as Record<string, unknown> | null) ?? null,
  },

  attachmentsData: {
    external: (ext) => (ext.attachments ? (ext.attachments as Array<Record<string, unknown>>) : null),
    domain: (dom) => dom.attachmentsData,
    dataTarget: (dt) => (dt.attachmentsData as Array<Record<string, unknown>> | null) ?? null,
  },

  extendedPropertiesData: {
    external: (ext) => (ext.extendedProperties ? ({ ...ext.extendedProperties } as Record<string, unknown>) : null),
    domain: (dom) => dom.extendedPropertiesData,
    dataTarget: (dt) => (dt.extendedPropertiesData as Record<string, unknown> | null) ?? null,
  },

  metadata: {
    external: (ext) => {
      const metadata: Record<string, unknown> = {};
      if (ext.source) metadata.source = ext.source;
      if (ext.gadget) metadata.gadget = ext.gadget;
      return Object.keys(metadata).length > 0 ? metadata : null;
    },
    domain: (dom) => dom.metadata,
    dataTarget: (dt) => (dt.metadata as Record<string, unknown> | null) ?? null,
  },

  eventCreatedAt: {
    external: (ext) => (ext.created ? new Date(ext.created) : null),
    domain: (dom) => dom.eventCreatedAt,
    dataTarget: (dt) => dt.eventCreatedAt ?? null,
  },

  eventUpdatedAt: {
    external: (ext) => (ext.updated ? new Date(ext.updated) : null),
    domain: (dom) => dom.eventUpdatedAt,
    dataTarget: (dt) => dt.eventUpdatedAt ?? null,
  },

  createdAt: {
    external: () => null,
    domain: (dom) => dom.createdAt,
    dataTarget: (dt) => (dt.createdAt ? dt.createdAt.toISOString() : null),
  },

  updatedAt: {
    external: () => null,
    domain: (dom) => dom.updatedAt,
    dataTarget: (dt) => (dt.updatedAt ? dt.updatedAt.toISOString() : null),
  },

  __type: {
    external: () => "event" as const,
    domain: (dom) => dom.__type,
    dataTarget: () => "event" as const,
  },
};

const eventDomainDefaults = { __type: "event" as const };

export const connectorGoogleCalendarEventMapper = new ConnectorMapper<
  GoogleCalendarEventExternal,
  GoogleCalendarEventEntity,
  GoogleCalendarEventDataTarget
>(googleCalendarEventMapping, eventDomainDefaults);

// --- Calendar Mapper ---

const googleCalendarCalendarMapping: ConnectorMapperDefinition<
  GoogleCalendarCalendarExternal,
  GoogleCalendarCalendarEntity,
  GoogleCalendarCalendarDataTarget
> = {
  id: connectorMapperPassThrough<
    "id",
    string,
    GoogleCalendarCalendarExternal,
    GoogleCalendarCalendarEntity,
    GoogleCalendarCalendarDataTarget
  >("id"),

  title: {
    external: (ext) => ext.summaryOverride || ext.summary || "",
    domain: (dom) => dom.title,
    dataTarget: (dt) => dt.title,
  },

  description: {
    external: (ext) => ext.description ?? null,
    domain: (dom) => dom.description,
    dataTarget: (dt) => dt.description ?? null,
  },

  location: {
    external: (ext) => ext.location ?? null,
    domain: (dom) => dom.location,
    dataTarget: (dt) => dt.location ?? null,
  },

  timeZone: {
    external: (ext) => ext.timeZone ?? null,
    domain: (dom) => dom.timeZone,
    dataTarget: (dt) => dt.timeZone ?? null,
  },

  colorId: {
    external: (ext) => ext.colorId ?? null,
    domain: (dom) => dom.colorId,
    dataTarget: (dt) => dt.colorId ?? null,
  },

  backgroundColor: {
    external: (ext) => ext.backgroundColor ?? null,
    domain: (dom) => dom.backgroundColor,
    dataTarget: (dt) => dt.backgroundColor ?? null,
  },

  foregroundColor: {
    external: (ext) => ext.foregroundColor ?? null,
    domain: (dom) => dom.foregroundColor,
    dataTarget: (dt) => dt.foregroundColor ?? null,
  },

  accessRole: {
    external: (ext) => ext.accessRole ?? null,
    domain: (dom) => dom.accessRole,
    dataTarget: (dt) => dt.accessRole ?? null,
  },

  isPrimary: {
    external: (ext) => ext.primary ?? false,
    domain: (dom) => dom.isPrimary,
    dataTarget: (dt) => dt.isPrimary ?? false,
  },

  isHidden: {
    external: (ext) => ext.hidden ?? false,
    domain: (dom) => dom.isHidden,
    dataTarget: (dt) => dt.isHidden ?? false,
  },

  isSelected: {
    external: (ext) => ext.selected ?? true,
    domain: (dom) => dom.isSelected,
    dataTarget: (dt) => dt.isSelected ?? true,
  },

  isDeleted: {
    external: (ext) => ext.deleted ?? false,
    domain: (dom) => dom.isDeleted,
    dataTarget: (dt) => dt.isDeleted ?? false,
  },

  defaultRemindersData: {
    external: (ext) => (ext.defaultReminders ? (ext.defaultReminders as Array<Record<string, unknown>>) : null),
    domain: (dom) => dom.defaultRemindersData,
    dataTarget: (dt) => (dt.defaultRemindersData as Array<Record<string, unknown>> | null) ?? null,
  },

  notificationSettingsData: {
    external: (ext) => (ext.notificationSettings ? ({ ...ext.notificationSettings } as Record<string, unknown>) : null),
    domain: (dom) => dom.notificationSettingsData,
    dataTarget: (dt) => (dt.notificationSettingsData as Record<string, unknown> | null) ?? null,
  },

  conferencePropertiesData: {
    external: (ext) => (ext.conferenceProperties ? ({ ...ext.conferenceProperties } as Record<string, unknown>) : null),
    domain: (dom) => dom.conferencePropertiesData,
    dataTarget: (dt) => (dt.conferencePropertiesData as Record<string, unknown> | null) ?? null,
  },

  metadata: {
    external: () => null,
    domain: (dom) => dom.metadata,
    dataTarget: (dt) => (dt.metadata as Record<string, unknown> | null) ?? null,
  },

  createdAt: {
    external: () => null,
    domain: (dom) => dom.createdAt,
    dataTarget: (dt) => (dt.createdAt ? dt.createdAt.toISOString() : null),
  },

  updatedAt: {
    external: () => null,
    domain: (dom) => dom.updatedAt,
    dataTarget: (dt) => (dt.updatedAt ? dt.updatedAt.toISOString() : null),
  },

  __type: {
    external: () => "calendar" as const,
    domain: (dom) => dom.__type,
    dataTarget: () => "calendar" as const,
  },
};

const calendarDomainDefaults = { __type: "calendar" as const };

export const connectorGoogleCalendarCalendarMapper = new ConnectorMapper<
  GoogleCalendarCalendarExternal,
  GoogleCalendarCalendarEntity,
  GoogleCalendarCalendarDataTarget
>(googleCalendarCalendarMapping, calendarDomainDefaults);
