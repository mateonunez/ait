import type {
  GoogleCalendarCalendarExternal,
  GoogleCalendarEventExternal,
  GoogleContactExternal,
  GoogleYouTubeSubscriptionExternal,
} from "@ait/core";
import type { GoogleCalendarPaginatedResponse } from "../../../types/infrastructure/connector.google-calendar.data-source.interface";
import type { GooglePeoplePaginatedResponse } from "../../../types/infrastructure/connector.google-contact.data-source.interface";
import type { GoogleYouTubePaginatedResponse } from "../../../types/infrastructure/connector.google-youtube.data-source.interface";
import { ConnectorGoogleCalendarDataSource } from "./connector.google-calendar.data-source";
import { ConnectorGoogleContactDataSource } from "./connector.google-contact.data-source";
import { ConnectorGoogleYouTubeDataSource } from "./connector.google-youtube.data-source";

export class ConnectorGoogleDataSource {
  private _calendarDataSource: ConnectorGoogleCalendarDataSource;
  private _youtubeDataSource: ConnectorGoogleYouTubeDataSource;
  private _contactDataSource: ConnectorGoogleContactDataSource;

  constructor(accessToken: string) {
    this._calendarDataSource = new ConnectorGoogleCalendarDataSource(accessToken);
    this._youtubeDataSource = new ConnectorGoogleYouTubeDataSource(accessToken);
    this._contactDataSource = new ConnectorGoogleContactDataSource(accessToken);
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

  // Contacts methods
  async fetchContacts(cursor?: string): Promise<GooglePeoplePaginatedResponse<GoogleContactExternal>> {
    return this._contactDataSource.fetchContacts(cursor);
  }
}
