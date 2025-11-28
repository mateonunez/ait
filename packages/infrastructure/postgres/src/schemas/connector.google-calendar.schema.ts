import { pgTable, varchar, integer, timestamp, boolean, text, jsonb } from "drizzle-orm/pg-core";

export const googleCalendarEvents = pgTable("google_calendar_events", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  isAllDay: boolean("is_all_day").default(false),
  timeZone: varchar("time_zone", { length: 100 }),
  location: varchar("location", { length: 512 }),
  status: varchar("status", { length: 50 }).notNull(),
  htmlUrl: varchar("html_url", { length: 512 }).notNull(),
  colorId: varchar("color_id", { length: 50 }),
  visibility: varchar("visibility", { length: 50 }),
  transparency: varchar("transparency", { length: 50 }),
  iCalUid: varchar("ical_uid", { length: 512 }),
  sequence: integer("sequence"),
  calendarId: varchar("calendar_id", { length: 255 }),
  recurringEventId: varchar("recurring_event_id", { length: 255 }),
  eventType: varchar("event_type", { length: 100 }),
  hangoutLink: varchar("hangout_link", { length: 512 }),
  anyoneCanAddSelf: boolean("anyone_can_add_self").default(false),
  guestsCanInviteOthers: boolean("guests_can_invite_others").default(true),
  guestsCanModify: boolean("guests_can_modify").default(false),
  guestsCanSeeOtherGuests: boolean("guests_can_see_other_guests").default(true),
  privateCopy: boolean("private_copy").default(false),
  locked: boolean("locked").default(false),
  attendeesOmitted: boolean("attendees_omitted").default(false),
  attendeesCount: integer("attendees_count").default(0),

  // JSONB fields for complex objects
  creatorData: jsonb("creator_data"),
  organizerData: jsonb("organizer_data"),
  attendeesData: jsonb("attendees_data"),
  recurrenceData: jsonb("recurrence_data"),
  remindersData: jsonb("reminders_data"),
  conferenceData: jsonb("conference_data"),
  attachmentsData: jsonb("attachments_data"),
  extendedPropertiesData: jsonb("extended_properties_data"),
  metadata: jsonb("metadata"),

  // Timestamps from Google Calendar API
  eventCreatedAt: timestamp("event_created_at"),
  eventUpdatedAt: timestamp("event_updated_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const googleCalendarCalendars = pgTable("google_calendar_calendars", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 512 }),
  timeZone: varchar("time_zone", { length: 100 }),
  colorId: varchar("color_id", { length: 50 }),
  backgroundColor: varchar("background_color", { length: 50 }),
  foregroundColor: varchar("foreground_color", { length: 50 }),
  accessRole: varchar("access_role", { length: 50 }),
  isPrimary: boolean("is_primary").default(false),
  isHidden: boolean("is_hidden").default(false),
  isSelected: boolean("is_selected").default(true),
  isDeleted: boolean("is_deleted").default(false),

  // JSONB fields for complex objects
  defaultRemindersData: jsonb("default_reminders_data"),
  notificationSettingsData: jsonb("notification_settings_data"),
  conferencePropertiesData: jsonb("conference_properties_data"),
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * DATA TARGET
 * Represents how we store the domain entity in a data layer (DB)
 */
export type GoogleCalendarEventDataTarget = typeof googleCalendarEvents.$inferInsert;
export type GoogleCalendarCalendarDataTarget = typeof googleCalendarCalendars.$inferInsert;
