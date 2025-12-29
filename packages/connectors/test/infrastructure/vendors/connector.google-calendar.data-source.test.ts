import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorGoogleCalendarDataSource } from "../../../src/infrastructure/vendors/google/connector.google-calendar.data-source";

describe("ConnectorGoogleCalendarDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorGoogleCalendarDataSource;
  let mockAccessToken: string;
  const googleCalendarEndpoint = "https://www.googleapis.com";

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorGoogleCalendarDataSource(mockAccessToken);
  });

  describe("fetchEvents", () => {
    it("should return a list of events", async () => {
      const mockEventsResponse = {
        kind: "calendar#events",
        items: [
          {
            id: "event-1",
            status: "confirmed",
            htmlLink: "https://calendar.google.com/event?eid=event-1",
            summary: "Team Meeting",
            description: "Weekly team sync",
            start: {
              dateTime: "2024-01-15T10:00:00-05:00",
              timeZone: "America/New_York",
            },
            end: {
              dateTime: "2024-01-15T11:00:00-05:00",
              timeZone: "America/New_York",
            },
            location: "Conference Room A",
            attendees: [
              { email: "user1@example.com", responseStatus: "accepted" },
              { email: "user2@example.com", responseStatus: "tentative" },
            ],
          },
        ],
      };

      const mockClient = agent.get(googleCalendarEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/calendar/v3/calendars/primary/events"),
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
        .reply(200, mockEventsResponse);

      const result = await dataSource.fetchEvents();

      assert.equal(result.items.length, 1);
      assert.equal(result.items[0]?.__type, "google_calendar_event");
      assert.equal(result.items[0]?.id, "event-1");
      assert.equal(result.items[0]?.summary, "Team Meeting");
      assert.equal(result.items[0]?.status, "confirmed");
    });

    it("should handle pagination with nextPageToken", async () => {
      const mockEventsPage1 = {
        kind: "calendar#events",
        items: [
          {
            id: "event-1",
            status: "confirmed",
            htmlLink: "https://calendar.google.com/event?eid=event-1",
            summary: "Event 1",
            start: { dateTime: "2024-01-15T10:00:00-05:00" },
            end: { dateTime: "2024-01-15T11:00:00-05:00" },
          },
        ],
        nextPageToken: "token-123",
      };

      const mockEventsPage2 = {
        kind: "calendar#events",
        items: [
          {
            id: "event-2",
            status: "confirmed",
            htmlLink: "https://calendar.google.com/event?eid=event-2",
            summary: "Event 2",
            start: { dateTime: "2024-01-15T12:00:00-05:00" },
            end: { dateTime: "2024-01-15T13:00:00-05:00" },
          },
        ],
      };

      const mockClient = agent.get(googleCalendarEndpoint);

      // First page request
      mockClient
        .intercept({
          path: (path) => path.startsWith("/calendar/v3/calendars/primary/events") && !path.includes("pageToken"),
          method: "GET",
        })
        .reply(200, mockEventsPage1);

      // Second page request with token
      mockClient
        .intercept({
          path: (path) =>
            path.startsWith("/calendar/v3/calendars/primary/events") && path.includes("pageToken=token-123"),
          method: "GET",
        })
        .reply(200, mockEventsPage2);

      const result1 = await dataSource.fetchEvents();
      assert.equal(result1.items.length, 1);
      assert.equal(result1.nextCursor, "token-123");

      const result2 = await dataSource.fetchEvents("token-123");
      assert.equal(result2.items.length, 1);
      assert.equal(result2.nextCursor, undefined);
    });

    it("should handle all-day events", async () => {
      const mockEventsResponse = {
        kind: "calendar#events",
        items: [
          {
            id: "event-allday",
            status: "confirmed",
            htmlLink: "https://calendar.google.com/event?eid=event-allday",
            summary: "All Day Event",
            start: {
              date: "2024-01-15",
            },
            end: {
              date: "2024-01-16",
            },
          },
        ],
      };

      const mockClient = agent.get(googleCalendarEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/calendar/v3/calendars/primary/events"),
          method: "GET",
        })
        .reply(200, mockEventsResponse);

      const result = await dataSource.fetchEvents();

      assert.equal(result.items.length, 1);
      assert.equal(result.items[0]?.id, "event-allday");
      // All-day events use date instead of dateTime
      assert.ok(result.items[0]?.start?.date);
      assert.ok(!result.items[0]?.start?.dateTime);
    });

    it("should handle empty event list", async () => {
      const mockEventsResponse = {
        kind: "calendar#events",
        items: [],
      };

      const mockClient = agent.get(googleCalendarEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/calendar/v3/calendars/primary/events"),
          method: "GET",
        })
        .reply(200, mockEventsResponse);

      const result = await dataSource.fetchEvents();

      assert.equal(result.items.length, 0);
      assert.equal(result.nextCursor, undefined);
    });

    it("should handle authentication errors", async () => {
      const mockClient = agent.get(googleCalendarEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/calendar/v3/calendars/primary/events"),
          method: "GET",
        })
        .reply(401, { error: { code: 401, message: "Invalid Credentials" } });

      await assert.rejects(
        () => dataSource.fetchEvents(),
        (error) => {
          assert.ok(error instanceof Error);
          return true;
        },
      );
    });

    it("should handle rate limiting (429)", async () => {
      const mockClient = agent.get(googleCalendarEndpoint);
      mockClient
        .intercept({
          path: (path) => path.startsWith("/calendar/v3/calendars/primary/events"),
          method: "GET",
        })
        .reply(429, { error: { code: 429, message: "Rate Limit Exceeded" } });

      await assert.rejects(
        () => dataSource.fetchEvents(),
        (error) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes("rate limit") || error.name === "RateLimitError");
          return true;
        },
      );
    });
  });

  describe("fetchCalendars", () => {
    it("should return a list of calendars", async () => {
      const mockCalendarsResponse = {
        kind: "calendar#calendarList",
        items: [
          {
            id: "primary",
            summary: "Primary Calendar",
            description: "My main calendar",
            timeZone: "America/New_York",
            backgroundColor: "#4285f4",
            foregroundColor: "#ffffff",
            primary: true,
            accessRole: "owner",
          },
          {
            id: "work@example.com",
            summary: "Work Calendar",
            timeZone: "America/New_York",
            backgroundColor: "#33b679",
            foregroundColor: "#000000",
            primary: false,
            accessRole: "reader",
          },
        ],
      };

      const mockClient = agent.get(googleCalendarEndpoint);
      mockClient
        .intercept({
          path: "/calendar/v3/users/me/calendarList",
          method: "GET",
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        })
        .reply(200, mockCalendarsResponse);

      const result = await dataSource.fetchCalendars();

      assert.equal(result.length, 2);
      assert.equal(result[0]?.__type, "google_calendar_calendar");
      assert.equal(result[0]?.id, "primary");
      assert.equal(result[0]?.summary, "Primary Calendar");
      assert.equal(result[0]?.primary, true);
      assert.equal(result[1]?.id, "work@example.com");
      assert.equal(result[1]?.primary, false);
    });

    it("should handle empty calendar list", async () => {
      const mockCalendarsResponse = {
        kind: "calendar#calendarList",
        items: [],
      };

      const mockClient = agent.get(googleCalendarEndpoint);
      mockClient
        .intercept({
          path: "/calendar/v3/users/me/calendarList",
          method: "GET",
        })
        .reply(200, mockCalendarsResponse);

      const result = await dataSource.fetchCalendars();

      assert.equal(result.length, 0);
    });
  });
});
