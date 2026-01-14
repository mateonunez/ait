import type {
  GoogleCalendarCalendarEntity,
  GoogleCalendarEventEntity,
  GoogleContactEntity,
  GooglePhotoEntity,
  GoogleYouTubeSubscriptionEntity,
  PaginatedResponse,
  PaginationParams,
} from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";
import type { IConnectorGoogleGmailRepository } from "./connector.google.gmail.types";

export interface IConnectorGoogleCalendarEventRepository {
  saveEvent(event: GoogleCalendarEventEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveEvents(events: GoogleCalendarEventEntity[]): Promise<void>;
  getEvent(id: string): Promise<GoogleCalendarEventEntity | null>;
  fetchEvents(): Promise<GoogleCalendarEventEntity[]>;
  getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>>;
}

export interface IConnectorGoogleCalendarCalendarRepository {
  saveCalendar(calendar: GoogleCalendarCalendarEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveCalendars(calendars: GoogleCalendarCalendarEntity[]): Promise<void>;
  getCalendar(id: string): Promise<GoogleCalendarCalendarEntity | null>;
  fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]>;
  getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>>;
}

export interface IConnectorGoogleYouTubeSubscriptionRepository {
  saveSubscription(
    subscription: GoogleYouTubeSubscriptionEntity,
    options?: IConnectorRepositorySaveOptions,
  ): Promise<void>;
  saveSubscriptions(subscriptions: GoogleYouTubeSubscriptionEntity[]): Promise<void>;
  getSubscription(id: string): Promise<GoogleYouTubeSubscriptionEntity | null>;
  fetchSubscriptions(): Promise<GoogleYouTubeSubscriptionEntity[]>;
  getSubscriptionsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleYouTubeSubscriptionEntity>>;
}

export interface IConnectorGoogleContactRepository {
  saveContact(contact: GoogleContactEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveContacts(contacts: GoogleContactEntity[]): Promise<void>;
  getContact(id: string): Promise<GoogleContactEntity | null>;
  fetchContacts(): Promise<GoogleContactEntity[]>;
  getContactsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleContactEntity>>;
}

export interface IConnectorGooglePhotoRepository {
  savePhoto(photo: GooglePhotoEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  savePhotos(photos: GooglePhotoEntity[]): Promise<void>;
  getPhoto(id: string): Promise<GooglePhotoEntity | null>;
  fetchPhotos(): Promise<GooglePhotoEntity[]>;
  getPhotosPaginated(params: PaginationParams): Promise<PaginatedResponse<GooglePhotoEntity>>;
}

export interface IConnectorGoogleRepository extends IConnectorRepository {
  connectorConfigId?: string;
  event: IConnectorGoogleCalendarEventRepository;
  calendar: IConnectorGoogleCalendarCalendarRepository;
  subscription: IConnectorGoogleYouTubeSubscriptionRepository;
  contact: IConnectorGoogleContactRepository;
  photo: IConnectorGooglePhotoRepository;
  gmail: IConnectorGoogleGmailRepository;
}
