-- Google Calendar Events table
CREATE TABLE IF NOT EXISTS "google_calendar_events" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "title" varchar(512) NOT NULL,
  "description" text,
  "start_time" timestamp,
  "end_time" timestamp,
  "is_all_day" boolean DEFAULT false,
  "time_zone" varchar(100),
  "location" varchar(512),
  "status" varchar(50) NOT NULL,
  "html_url" varchar(512) NOT NULL,
  "color_id" varchar(50),
  "visibility" varchar(50),
  "transparency" varchar(50),
  "ical_uid" varchar(512),
  "sequence" integer,
  "calendar_id" varchar(255),
  "recurring_event_id" varchar(255),
  "event_type" varchar(100),
  "hangout_link" varchar(512),
  "anyone_can_add_self" boolean DEFAULT false,
  "guests_can_invite_others" boolean DEFAULT true,
  "guests_can_modify" boolean DEFAULT false,
  "guests_can_see_other_guests" boolean DEFAULT true,
  "private_copy" boolean DEFAULT false,
  "locked" boolean DEFAULT false,
  "attendees_omitted" boolean DEFAULT false,
  "attendees_count" integer DEFAULT 0,
  "creator_data" jsonb,
  "organizer_data" jsonb,
  "attendees_data" jsonb,
  "recurrence_data" jsonb,
  "reminders_data" jsonb,
  "conference_data" jsonb,
  "attachments_data" jsonb,
  "extended_properties_data" jsonb,
  "metadata" jsonb,
  "event_created_at" timestamp,
  "event_updated_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Google Calendar Calendars table
CREATE TABLE IF NOT EXISTS "google_calendar_calendars" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "title" varchar(512) NOT NULL,
  "description" text,
  "location" varchar(512),
  "time_zone" varchar(100),
  "color_id" varchar(50),
  "background_color" varchar(50),
  "foreground_color" varchar(50),
  "access_role" varchar(50),
  "is_primary" boolean DEFAULT false,
  "is_hidden" boolean DEFAULT false,
  "is_selected" boolean DEFAULT true,
  "is_deleted" boolean DEFAULT false,
  "default_reminders_data" jsonb,
  "notification_settings_data" jsonb,
  "conference_properties_data" jsonb,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_google_calendar_events_calendar_id" ON "google_calendar_events" ("calendar_id");
CREATE INDEX IF NOT EXISTS "idx_google_calendar_events_start_time" ON "google_calendar_events" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_google_calendar_events_status" ON "google_calendar_events" ("status");
CREATE INDEX IF NOT EXISTS "idx_google_calendar_events_recurring_event_id" ON "google_calendar_events" ("recurring_event_id");
CREATE INDEX IF NOT EXISTS "idx_google_calendar_calendars_is_primary" ON "google_calendar_calendars" ("is_primary");
