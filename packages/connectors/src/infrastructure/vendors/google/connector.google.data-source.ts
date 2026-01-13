import type {
  GmailMessageExternal,
  GmailThreadExternal,
  GoogleCalendarCalendarExternal,
  GoogleCalendarEventExternal,
  GoogleContactExternal,
  GooglePhotoExternal,
  GoogleYouTubeSubscriptionExternal,
  PickerPhotoInput,
} from "@ait/core";
import type { GoogleCalendarPaginatedResponse } from "../../../types/infrastructure/connector.google-calendar.data-source.interface";
import type { GooglePeoplePaginatedResponse } from "../../../types/infrastructure/connector.google-contact.data-source.interface";
import type { GooglePhotosPaginatedResponse } from "../../../types/infrastructure/connector.google-photos.data-source.interface";
import type { GoogleYouTubePaginatedResponse } from "../../../types/infrastructure/connector.google-youtube.data-source.interface";
import type { GmailPaginatedResponse } from "../../../types/infrastructure/connector.google.gmail.data-source.interface";
import { ConnectorGoogleCalendarDataSource } from "./connector.google-calendar.data-source";
import { ConnectorGoogleContactDataSource } from "./connector.google-contact.data-source";
import { ConnectorGooglePhotosDataSource } from "./connector.google-photos.data-source";
import { ConnectorGoogleYouTubeDataSource } from "./connector.google-youtube.data-source";
import { ConnectorGoogleGmailDataSource } from "./connector.google.gmail.data-source";

export class ConnectorGoogleDataSource {
  private _calendarDataSource: ConnectorGoogleCalendarDataSource;
  private _youtubeDataSource: ConnectorGoogleYouTubeDataSource;
  private _contactDataSource: ConnectorGoogleContactDataSource;
  private _photosDataSource: ConnectorGooglePhotosDataSource;
  private _gmailDataSource: ConnectorGoogleGmailDataSource;

  constructor(accessToken: string) {
    this._calendarDataSource = new ConnectorGoogleCalendarDataSource(accessToken);
    this._youtubeDataSource = new ConnectorGoogleYouTubeDataSource(accessToken);
    this._contactDataSource = new ConnectorGoogleContactDataSource(accessToken);
    this._photosDataSource = new ConnectorGooglePhotosDataSource(accessToken);
    this._gmailDataSource = new ConnectorGoogleGmailDataSource(accessToken);
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

  // Photos methods
  async fetchPhotos(cursor?: string): Promise<GooglePhotosPaginatedResponse<GooglePhotoExternal>> {
    return this._photosDataSource.fetchPhotos(cursor);
  }

  // Picker methods
  async createPickerSession(): Promise<Record<string, unknown>> {
    return this._photosDataSource.createPickerSession();
  }

  async getPickerSession(sessionId: string): Promise<Record<string, unknown>> {
    return this._photosDataSource.getPickerSession(sessionId);
  }

  async listPickerMediaItems(sessionId: string): Promise<PickerPhotoInput[]> {
    return this._photosDataSource.listPickerMediaItems(sessionId);
  }

  async listMessages(cursor?: string): Promise<GmailPaginatedResponse<GmailMessageExternal>> {
    return this._gmailDataSource.listMessages(cursor);
  }

  async getMessage(id: string): Promise<GmailMessageExternal> {
    return this._gmailDataSource.getMessage(id);
  }

  async listThreads(cursor?: string): Promise<GmailPaginatedResponse<GmailThreadExternal>> {
    return this._gmailDataSource.listThreads(cursor);
  }

  async getThread(id: string): Promise<GmailThreadExternal> {
    return this._gmailDataSource.getThread(id);
  }
}
