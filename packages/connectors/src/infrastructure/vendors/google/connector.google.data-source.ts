import { ConnectorGoogleCalendarDataSource } from "./connector.google-calendar.data-source";
import { ConnectorGoogleYouTubeDataSource } from "./connector.google-youtube.data-source";
import type {
  GoogleCalendarEventExternal,
  GoogleCalendarCalendarExternal,
  GoogleYouTubeSubscriptionExternal,
} from "@ait/core";
import type { GoogleCalendarPaginatedResponse } from "../../../types/infrastructure/connector.google-calendar.data-source.interface";
import type { GoogleYouTubePaginatedResponse } from "../../../types/infrastructure/connector.google-youtube.data-source.interface";

export class ConnectorGoogleDataSource {
  private _calendarDataSource: ConnectorGoogleCalendarDataSource;
  private _youtubeDataSource: ConnectorGoogleYouTubeDataSource;

  constructor(accessToken: string) {
    this._calendarDataSource = new ConnectorGoogleCalendarDataSource(accessToken);
    this._youtubeDataSource = new ConnectorGoogleYouTubeDataSource(accessToken);
  }

  // Calendar methods
  async fetchEvents(cursor?: string): Promise<GoogleCalendarPaginatedResponse<GoogleCalendarEventExternal>> {
    return this._calendarDataSource.fetchEvents(cursor);
  }

  async fetchCalendars(): Promise<GoogleCalendarCalendarExternal[]> {
    return this._calendarDataSource.fetchCalendars();
  }

  // YouTube methods
  async fetchSubscriptions(
    cursor?: string,
  ): Promise<GoogleYouTubePaginatedResponse<GoogleYouTubeSubscriptionExternal>> {
    return this._youtubeDataSource.fetchSubscriptions(cursor);
  }
}
