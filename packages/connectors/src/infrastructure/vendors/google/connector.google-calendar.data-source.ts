import type { GoogleCalendarCalendarExternal, GoogleCalendarEventExternal } from "@ait/core";
import { AItError, RateLimitError, getErrorMessage, getLogger, requestJson } from "@ait/core";
import type {
  GoogleCalendarPaginatedResponse,
  IConnectorGoogleCalendarDataSource,
} from "../../../types/infrastructure/connector.google-calendar.data-source.interface";

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
      timeMax: this._getTimeMax(),
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
          __type: "google_calendar_event" as const,
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
          __type: "google_calendar_calendar" as const,
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

  private _getTimeMax(): string {
    // Limit to 2 years in the future to prevent unbounded recurring event fetching
    const date = new Date();
    date.setFullYear(date.getFullYear() + 2);
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
    } catch (error: unknown) {
      if (error instanceof AItError) {
        // Log the full error for debugging
        this._logger.error("Google Calendar API error", {
          code: error.code,
          message: error.message,
          meta: error.meta,
        });

        // Handle rate limiting
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const retryAfter = headers["retry-after"];
          const resetTime = retryAfter ? Date.now() + Number.parseInt(retryAfter, 10) * 1000 : Date.now() + 60 * 1000;
          throw new RateLimitError("google", resetTime, "Google Calendar rate limit exceeded");
        }

        // Handle 403 - could be quota, disabled API, or permission issues
        if (error.code === "HTTP_403" || error.meta?.status === 403) {
          const errorMessage = error.message || "";
          const metaMessage = (error.meta?.body as Record<string, unknown>)?.error;
          const fullMessage =
            ((typeof metaMessage === "object" && metaMessage !== null
              ? (metaMessage as Record<string, unknown>).message
              : undefined) as string) || errorMessage;

          // Check if it's an API not enabled error
          if (fullMessage.includes("has not been used") || fullMessage.includes("is disabled")) {
            throw new AItError(
              "API_DISABLED",
              "Google Calendar API is not enabled. Please enable it at https://logger.cloud.google.com/apis/library/calendar-json.googleapis.com",
              { originalError: fullMessage },
            );
          }

          // Check if it's a permission/scope issue
          if (fullMessage.includes("insufficient") || fullMessage.includes("permission")) {
            throw new AItError(
              "INSUFFICIENT_PERMISSIONS",
              "Insufficient permissions for Google Calendar. Please re-authorize with the required scopes.",
              { originalError: fullMessage },
            );
          }

          // Otherwise treat as quota exceeded
          throw new RateLimitError(
            "google",
            Date.now() + 60 * 60 * 1000, // 1 hour
            `Google Calendar API error (403): ${fullMessage || "quota exceeded or forbidden"}`,
          );
        }

        // Handle 401 - unauthorized/token expired
        if (error.code === "HTTP_401" || error.meta?.status === 401) {
          throw new AItError(
            "UNAUTHORIZED",
            "Google Calendar access token is invalid or expired. Please re-authenticate.",
            { originalError: error.message },
          );
        }

        throw error;
      }

      throw new AItError(
        "NETWORK",
        `Network error: ${getErrorMessage(error)}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
