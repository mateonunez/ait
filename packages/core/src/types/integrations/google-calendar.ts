import { z } from "zod";

// --- External Types (from Google Calendar API) ---

export interface BaseGoogleCalendarEntity {
  __type: "event" | "calendar";
}

export interface GoogleCalendarEventExternal extends BaseGoogleCalendarEntity {
  __type: "event";
  id: string;
  status: string;
  htmlLink: string;
  created?: string;
  updated?: string;
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator?: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  organizer?: {
    id?: string;
    email?: string;
    displayName?: string;
    self?: boolean;
  };
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  endTimeUnspecified?: boolean;
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  transparency?: string;
  visibility?: string;
  iCalUID?: string;
  sequence?: number;
  attendees?: Array<{
    id?: string;
    email?: string;
    displayName?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    responseStatus?: string;
    comment?: string;
    additionalGuests?: number;
  }>;
  attendeesOmitted?: boolean;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  hangoutLink?: string;
  conferenceData?: {
    createRequest?: {
      requestId?: string;
      conferenceSolutionKey?: { type?: string };
      status?: { statusCode?: string };
    };
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
      label?: string;
      pin?: string;
      accessCode?: string;
      meetingCode?: string;
      passcode?: string;
      password?: string;
    }>;
    conferenceSolution?: {
      key?: { type?: string };
      name?: string;
      iconUri?: string;
    };
    conferenceId?: string;
    signature?: string;
    notes?: string;
  };
  gadget?: {
    type?: string;
    title?: string;
    link?: string;
    iconLink?: string;
    width?: number;
    height?: number;
    display?: string;
    preferences?: Record<string, string>;
  };
  anyoneCanAddSelf?: boolean;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  privateCopy?: boolean;
  locked?: boolean;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method?: string;
      minutes?: number;
    }>;
  };
  source?: {
    url?: string;
    title?: string;
  };
  attachments?: Array<{
    fileUrl?: string;
    title?: string;
    mimeType?: string;
    iconLink?: string;
    fileId?: string;
  }>;
  eventType?: string;
}

export interface GoogleCalendarCalendarExternal extends BaseGoogleCalendarEntity {
  __type: "calendar";
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole?: string;
  defaultReminders?: Array<{
    method?: string;
    minutes?: number;
  }>;
  notificationSettings?: {
    notifications?: Array<{
      type?: string;
      method?: string;
    }>;
  };
  primary?: boolean;
  deleted?: boolean;
  conferenceProperties?: {
    allowedConferenceSolutionTypes?: string[];
  };
}

export type GoogleCalendarExternal = GoogleCalendarEventExternal | GoogleCalendarCalendarExternal;

// --- Zod Schemas for validation ---

export const GoogleCalendarEventSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    htmlLink: z.string().url(),
    created: z.string().optional(),
    updated: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    colorId: z.string().optional(),
    creator: z
      .object({
        id: z.string().optional(),
        email: z.string().optional(),
        displayName: z.string().optional(),
        self: z.boolean().optional(),
      })
      .optional(),
    organizer: z
      .object({
        id: z.string().optional(),
        email: z.string().optional(),
        displayName: z.string().optional(),
        self: z.boolean().optional(),
      })
      .optional(),
    start: z
      .object({
        date: z.string().optional(),
        dateTime: z.string().optional(),
        timeZone: z.string().optional(),
      })
      .optional(),
    end: z
      .object({
        date: z.string().optional(),
        dateTime: z.string().optional(),
        timeZone: z.string().optional(),
      })
      .optional(),
    recurrence: z.array(z.string()).optional(),
    recurringEventId: z.string().optional(),
    transparency: z.string().optional(),
    visibility: z.string().optional(),
    iCalUID: z.string().optional(),
    sequence: z.number().optional(),
    attendees: z
      .array(
        z.object({
          id: z.string().optional(),
          email: z.string().optional(),
          displayName: z.string().optional(),
          organizer: z.boolean().optional(),
          self: z.boolean().optional(),
          resource: z.boolean().optional(),
          optional: z.boolean().optional(),
          responseStatus: z.string().optional(),
          comment: z.string().optional(),
          additionalGuests: z.number().optional(),
        }),
      )
      .optional(),
    hangoutLink: z.string().optional(),
    conferenceData: z.any().optional(),
    reminders: z
      .object({
        useDefault: z.boolean().optional(),
        overrides: z
          .array(
            z.object({
              method: z.string().optional(),
              minutes: z.number().optional(),
            }),
          )
          .optional(),
      })
      .optional(),
    attachments: z
      .array(
        z.object({
          fileUrl: z.string().optional(),
          title: z.string().optional(),
          mimeType: z.string().optional(),
          iconLink: z.string().optional(),
          fileId: z.string().optional(),
        }),
      )
      .optional(),
    eventType: z.string().optional(),
  })
  .passthrough();

export const GoogleCalendarCalendarSchema = z
  .object({
    id: z.string(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    summaryOverride: z.string().optional(),
    colorId: z.string().optional(),
    backgroundColor: z.string().optional(),
    foregroundColor: z.string().optional(),
    hidden: z.boolean().optional(),
    selected: z.boolean().optional(),
    accessRole: z.string().optional(),
    primary: z.boolean().optional(),
    deleted: z.boolean().optional(),
  })
  .passthrough();

// --- Domain Types (normalized for app use) ---

export const GoogleCalendarEventEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.date().nullable(),
  endTime: z.date().nullable(),
  isAllDay: z.boolean(),
  timeZone: z.string().nullable(),
  location: z.string().nullable(),
  status: z.string(),
  htmlUrl: z.string(),
  colorId: z.string().nullable(),
  visibility: z.string().nullable(),
  transparency: z.string().nullable(),
  iCalUid: z.string().nullable(),
  sequence: z.number().nullable(),
  calendarId: z.string().nullable(),
  recurringEventId: z.string().nullable(),
  eventType: z.string().nullable(),
  hangoutLink: z.string().nullable(),
  anyoneCanAddSelf: z.boolean(),
  guestsCanInviteOthers: z.boolean(),
  guestsCanModify: z.boolean(),
  guestsCanSeeOtherGuests: z.boolean(),
  privateCopy: z.boolean(),
  locked: z.boolean(),
  attendeesOmitted: z.boolean(),
  attendeesCount: z.number(),
  // JSONB fields
  creatorData: z.record(z.string(), z.unknown()).nullable(),
  organizerData: z.record(z.string(), z.unknown()).nullable(),
  attendeesData: z.array(z.record(z.string(), z.unknown())).nullable(),
  recurrenceData: z.array(z.string()).nullable(),
  remindersData: z.record(z.string(), z.unknown()).nullable(),
  conferenceData: z.record(z.string(), z.unknown()).nullable(),
  attachmentsData: z.array(z.record(z.string(), z.unknown())).nullable(),
  extendedPropertiesData: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  eventCreatedAt: z.date().nullable(),
  eventUpdatedAt: z.date().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  __type: z.literal("event"),
});

export const GoogleCalendarCalendarEntitySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  timeZone: z.string().nullable(),
  colorId: z.string().nullable(),
  backgroundColor: z.string().nullable(),
  foregroundColor: z.string().nullable(),
  accessRole: z.string().nullable(),
  isPrimary: z.boolean(),
  isHidden: z.boolean(),
  isSelected: z.boolean(),
  isDeleted: z.boolean(),
  defaultRemindersData: z.array(z.record(z.string(), z.unknown())).nullable(),
  notificationSettingsData: z.record(z.string(), z.unknown()).nullable(),
  conferencePropertiesData: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
  __type: z.literal("calendar"),
});

export type GoogleCalendarEventEntity = z.infer<typeof GoogleCalendarEventEntitySchema>;
export type GoogleCalendarCalendarEntity = z.infer<typeof GoogleCalendarCalendarEntitySchema>;

export type GoogleCalendarEntity = GoogleCalendarEventEntity | GoogleCalendarCalendarEntity;
