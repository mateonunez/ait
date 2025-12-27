import type { PaginatedResponse, PaginationParams } from "@ait/core";
import type {
  GoogleCalendarCalendarEntity,
  GoogleCalendarEventEntity,
} from "../../../../domain/entities/google/google-calendar.entity";
import type { GoogleYouTubeSubscriptionEntity } from "../../../../domain/entities/google/google-youtube.entity";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

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

export interface IConnectorGoogleRepository extends IConnectorRepository {
  event: IConnectorGoogleCalendarEventRepository;
  calendar: IConnectorGoogleCalendarCalendarRepository;
  subscription: IConnectorGoogleYouTubeSubscriptionRepository;
}
