import type { GoogleCalendarCalendarExternal, GoogleCalendarEventExternal } from "@ait/core";

export interface GoogleCalendarPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface IConnectorGoogleCalendarDataSource {
  fetchEvents(cursor?: string): Promise<GoogleCalendarPaginatedResponse<GoogleCalendarEventExternal>>;
  fetchCalendars(): Promise<GoogleCalendarCalendarExternal[]>;
}
