import type { GoogleCalendarEventExternal, GoogleCalendarCalendarExternal } from "@ait/core";
import type {
  IConnectorGoogleCalendarDataSource,
  GoogleCalendarPaginatedResponse,
} from "../../../types/infrastructure/connector.google-calendar.data-source.interface";
import { requestJson, AItError, RateLimitError, getLogger } from "@ait/core";

export class ConnectorGoogleCalendarDataSource implements IConnectorGoogleCalendarDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private _logger = getLogger();

  constructor(accessToken: string) {
    this.apiUrl = process.env.GOOGLE_CALENDAR_API_ENDPOINT || "https://www.googleapis.com/calendar/v3";
    this.accessToken = accessToken;
  }

  async fetchEvents(cursor?: string): Promise<GoogleCalendarPaginatedResponse<GoogleCalendarEventExternal>> {
    const params = new URLSearchParams({
      maxResults: "250",
      singleEvents: "true",
      orderBy: "startTime",
      timeMin: this._getTimeMin(),
    });

    if (cursor) {
      params.append("pageToken", cursor);
    }

    try {
      const response = await this._fetchFromGoogleCalendar<{
        items?: Array<Omit<GoogleCalendarEventExternal, "__type">>;
        nextPageToken?: string;
      }>(`/calendars/primary/events?${params.toString()}`);

      const events: GoogleCalendarEventExternal[] =
        response?.items?.map((event) => ({
          ...event,
          __type: "event" as const,
        })) ?? [];

      return {
        items: events,
        nextCursor: response.nextPageToken,
      };
    } catch (error) {
      this._logger.error("Failed to fetch Google Calendar events", { error });
      throw error;
    }
  }

  async fetchCalendars(): Promise<GoogleCalendarCalendarExternal[]> {
    try {
      const response = await this._fetchFromGoogleCalendar<{
        items?: Array<Omit<GoogleCalendarCalendarExternal, "__type">>;
      }>("/users/me/calendarList");

      return (
        response?.items?.map((calendar) => ({
          ...calendar,
          __type: "calendar" as const,
        })) ?? []
      );
    } catch (error) {
      this._logger.error("Failed to fetch Google Calendar calendars", { error });
      throw error;
    }
  }

  private _getTimeMin(): string {
    // Default to 30 days ago
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString();
  }

  private async _fetchFromGoogleCalendar<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const result = await requestJson<T>(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!result.ok) {
        throw result.error;
      }

      return result.value.data as unknown as T;
    } catch (error: any) {
      if (error instanceof AItError) {
        // Handle rate limiting
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const retryAfter = headers["retry-after"];
          const resetTime = retryAfter ? Date.now() + Number.parseInt(retryAfter, 10) * 1000 : Date.now() + 60 * 1000;
          throw new RateLimitError("google", resetTime, "Google Calendar rate limit exceeded");
        }

        // Handle 403 (quota exceeded)
        if (error.code === "HTTP_403" || error.meta?.status === 403) {
          throw new RateLimitError(
            "google",
            Date.now() + 60 * 60 * 1000, // 1 hour
            "Google Calendar quota exceeded",
          );
        }

        throw error;
      }

      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }
}
