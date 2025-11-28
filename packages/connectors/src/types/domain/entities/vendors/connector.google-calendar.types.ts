import type {
  GoogleCalendarEventEntity,
  GoogleCalendarCalendarEntity,
  PaginatedResponse,
  PaginationParams,
} from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorGoogleCalendarEventRepository {
  saveEvent(event: Partial<GoogleCalendarEventEntity>, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveEvents(events: Partial<GoogleCalendarEventEntity>[]): Promise<void>;
  getEvent(id: string): Promise<GoogleCalendarEventEntity | null>;
  fetchEvents(): Promise<GoogleCalendarEventEntity[]>;
  getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>>;
}

export interface IConnectorGoogleCalendarCalendarRepository {
  saveCalendar(
    calendar: Partial<GoogleCalendarCalendarEntity>,
    options?: IConnectorRepositorySaveOptions,
  ): Promise<void>;
  saveCalendars(calendars: Partial<GoogleCalendarCalendarEntity>[]): Promise<void>;
  getCalendar(id: string): Promise<GoogleCalendarCalendarEntity | null>;
  fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]>;
  getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>>;
}

export interface IConnectorGoogleRepository extends IConnectorRepository {
  event: IConnectorGoogleCalendarEventRepository;
  calendar: IConnectorGoogleCalendarCalendarRepository;
}
