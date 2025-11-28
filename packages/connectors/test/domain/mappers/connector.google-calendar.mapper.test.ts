import {
  connectorGoogleCalendarEventMapper,
  connectorGoogleCalendarCalendarMapper,
} from "../../../src/domain/mappers/vendors/connector.google.mapper";
import type { GoogleCalendarEventExternal, GoogleCalendarCalendarExternal } from "@ait/core";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("Google Calendar Mappers", () => {
  describe("connectorGoogleCalendarEventMapper", () => {
    describe("externalToDomain", () => {
      it("should map external event to domain entity", () => {
        const externalEvent: GoogleCalendarEventExternal = {
          __type: "event",
          id: "event-123",
          status: "confirmed",
          htmlLink: "https://calendar.google.com/event?eid=event-123",
          summary: "Team Meeting",
          description: "Weekly team sync meeting",
          location: "Conference Room A",
          start: {
            dateTime: "2024-01-15T10:00:00-05:00",
            timeZone: "America/New_York",
          },
          end: {
            dateTime: "2024-01-15T11:00:00-05:00",
            timeZone: "America/New_York",
          },
          visibility: "default",
          transparency: "opaque",
          iCalUID: "event-123@google.com",
          sequence: 0,
          recurringEventId: undefined,
          hangoutLink: "https://meet.google.com/abc-defg-hij",
          attendees: [
            { email: "user1@example.com", responseStatus: "accepted" },
            { email: "user2@example.com", responseStatus: "tentative" },
          ],
          creator: { email: "creator@example.com", displayName: "Creator" },
          organizer: { email: "organizer@example.com", displayName: "Organizer" },
          created: "2024-01-01T00:00:00Z",
          updated: "2024-01-10T00:00:00Z",
        };

        const domainEvent = connectorGoogleCalendarEventMapper.externalToDomain(externalEvent);

        assert.equal(domainEvent.id, "event-123");
        assert.equal(domainEvent.title, "Team Meeting");
        assert.equal(domainEvent.description, "Weekly team sync meeting");
        assert.equal(domainEvent.location, "Conference Room A");
        assert.equal(domainEvent.status, "confirmed");
        assert.equal(domainEvent.htmlUrl, "https://calendar.google.com/event?eid=event-123");
        assert.equal(domainEvent.visibility, "default");
        assert.equal(domainEvent.transparency, "opaque");
        assert.equal(domainEvent.hangoutLink, "https://meet.google.com/abc-defg-hij");
        assert.equal(domainEvent.attendeesCount, 2);
        assert.equal(domainEvent.isAllDay, false);
        assert.equal(domainEvent.__type, "event");
        assert.ok(domainEvent.startTime instanceof Date);
        assert.ok(domainEvent.endTime instanceof Date);
        assert.ok(domainEvent.creatorData);
        assert.ok(domainEvent.organizerData);
        assert.ok(domainEvent.attendeesData);
      });

      it("should handle all-day events correctly", () => {
        const externalEvent: GoogleCalendarEventExternal = {
          __type: "event",
          id: "allday-event",
          status: "confirmed",
          htmlLink: "https://calendar.google.com/event?eid=allday",
          summary: "Holiday",
          start: {
            date: "2024-01-15",
          },
          end: {
            date: "2024-01-16",
          },
        };

        const domainEvent = connectorGoogleCalendarEventMapper.externalToDomain(externalEvent);

        assert.equal(domainEvent.isAllDay, true);
        assert.ok(domainEvent.startTime instanceof Date);
        assert.ok(domainEvent.endTime instanceof Date);
      });

      it("should handle events with minimal data", () => {
        const externalEvent: GoogleCalendarEventExternal = {
          __type: "event",
          id: "minimal-event",
          status: "confirmed",
          htmlLink: "https://calendar.google.com/event?eid=minimal",
        };

        const domainEvent = connectorGoogleCalendarEventMapper.externalToDomain(externalEvent);

        assert.equal(domainEvent.id, "minimal-event");
        assert.equal(domainEvent.title, "");
        assert.equal(domainEvent.description, null);
        assert.equal(domainEvent.location, null);
        assert.equal(domainEvent.startTime, null);
        assert.equal(domainEvent.endTime, null);
        assert.equal(domainEvent.isAllDay, false);
        assert.equal(domainEvent.attendeesCount, 0);
        assert.equal(domainEvent.__type, "event");
      });

      it("should handle recurring events", () => {
        const externalEvent: GoogleCalendarEventExternal = {
          __type: "event",
          id: "recurring-instance",
          status: "confirmed",
          htmlLink: "https://calendar.google.com/event?eid=recurring",
          summary: "Daily Standup",
          recurringEventId: "parent-event-id",
          recurrence: ["RRULE:FREQ=DAILY;COUNT=5"],
          start: { dateTime: "2024-01-15T09:00:00-05:00" },
          end: { dateTime: "2024-01-15T09:15:00-05:00" },
        };

        const domainEvent = connectorGoogleCalendarEventMapper.externalToDomain(externalEvent);

        assert.equal(domainEvent.recurringEventId, "parent-event-id");
        assert.deepEqual(domainEvent.recurrenceData, ["RRULE:FREQ=DAILY;COUNT=5"]);
      });
    });

    describe("domainToDataTarget", () => {
      it("should map domain event to data target", () => {
        const externalEvent: GoogleCalendarEventExternal = {
          __type: "event",
          id: "event-123",
          status: "confirmed",
          htmlLink: "https://calendar.google.com/event?eid=event-123",
          summary: "Test Event",
          start: { dateTime: "2024-01-15T10:00:00Z" },
          end: { dateTime: "2024-01-15T11:00:00Z" },
        };

        const domainEvent = connectorGoogleCalendarEventMapper.externalToDomain(externalEvent);
        const dataTarget = connectorGoogleCalendarEventMapper.domainToDataTarget(domainEvent);

        assert.equal(dataTarget.id, "event-123");
        assert.equal(dataTarget.title, "Test Event");
        assert.equal(dataTarget.status, "confirmed");
        assert.equal(dataTarget.htmlUrl, "https://calendar.google.com/event?eid=event-123");
      });
    });
  });

  describe("connectorGoogleCalendarCalendarMapper", () => {
    describe("externalToDomain", () => {
      it("should map external calendar to domain entity", () => {
        const externalCalendar: GoogleCalendarCalendarExternal = {
          __type: "calendar",
          id: "primary",
          summary: "Primary Calendar",
          description: "My main calendar",
          location: "Home",
          timeZone: "America/New_York",
          colorId: "1",
          backgroundColor: "#4285f4",
          foregroundColor: "#ffffff",
          accessRole: "owner",
          primary: true,
          hidden: false,
          selected: true,
          deleted: false,
          defaultReminders: [{ method: "popup", minutes: 10 }],
        };

        const domainCalendar = connectorGoogleCalendarCalendarMapper.externalToDomain(externalCalendar);

        assert.equal(domainCalendar.id, "primary");
        assert.equal(domainCalendar.title, "Primary Calendar");
        assert.equal(domainCalendar.description, "My main calendar");
        assert.equal(domainCalendar.location, "Home");
        assert.equal(domainCalendar.timeZone, "America/New_York");
        assert.equal(domainCalendar.backgroundColor, "#4285f4");
        assert.equal(domainCalendar.foregroundColor, "#ffffff");
        assert.equal(domainCalendar.accessRole, "owner");
        assert.equal(domainCalendar.isPrimary, true);
        assert.equal(domainCalendar.isHidden, false);
        assert.equal(domainCalendar.isSelected, true);
        assert.equal(domainCalendar.isDeleted, false);
        assert.equal(domainCalendar.__type, "calendar");
        assert.ok(domainCalendar.defaultRemindersData);
      });

      it("should use summaryOverride when available", () => {
        const externalCalendar: GoogleCalendarCalendarExternal = {
          __type: "calendar",
          id: "shared-calendar",
          summary: "Original Name",
          summaryOverride: "My Custom Name",
        };

        const domainCalendar = connectorGoogleCalendarCalendarMapper.externalToDomain(externalCalendar);

        assert.equal(domainCalendar.title, "My Custom Name");
      });

      it("should handle calendar with minimal data", () => {
        const externalCalendar: GoogleCalendarCalendarExternal = {
          __type: "calendar",
          id: "minimal-calendar",
        };

        const domainCalendar = connectorGoogleCalendarCalendarMapper.externalToDomain(externalCalendar);

        assert.equal(domainCalendar.id, "minimal-calendar");
        assert.equal(domainCalendar.title, "");
        assert.equal(domainCalendar.description, null);
        assert.equal(domainCalendar.isPrimary, false);
        assert.equal(domainCalendar.isHidden, false);
        assert.equal(domainCalendar.isSelected, true);
        assert.equal(domainCalendar.__type, "calendar");
      });
    });

    describe("domainToDataTarget", () => {
      it("should map domain calendar to data target", () => {
        const externalCalendar: GoogleCalendarCalendarExternal = {
          __type: "calendar",
          id: "calendar-123",
          summary: "Test Calendar",
          timeZone: "UTC",
          primary: true,
        };

        const domainCalendar = connectorGoogleCalendarCalendarMapper.externalToDomain(externalCalendar);
        const dataTarget = connectorGoogleCalendarCalendarMapper.domainToDataTarget(domainCalendar);

        assert.equal(dataTarget.id, "calendar-123");
        assert.equal(dataTarget.title, "Test Calendar");
        assert.equal(dataTarget.timeZone, "UTC");
        assert.equal(dataTarget.isPrimary, true);
      });
    });
  });
});
