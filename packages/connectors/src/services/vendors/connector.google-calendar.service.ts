import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorGoogle } from "../../infrastructure/vendors/google/connector.google";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { getConnectorConfig } from "../connector.service.config";
import type {
  GoogleCalendarEventEntity,
  GoogleCalendarEventExternal,
  GoogleCalendarCalendarEntity,
  GoogleCalendarCalendarExternal,
  PaginatedResponse,
  PaginationParams,
} from "@ait/core";
import {
  connectorEntityConfigs,
  GOOGLE_ENTITY_TYPES_ENUM,
  type GoogleServiceEntityMap,
} from "./connector.vendors.config";

export interface IConnectorGoogleService extends ConnectorServiceBase<ConnectorGoogle, GoogleServiceEntityMap> {
  fetchEvents(): Promise<GoogleCalendarEventEntity[]>;
  fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]>;
  getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>>;
  getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>>;
}

export class ConnectorGoogleService
  extends ConnectorServiceBase<ConnectorGoogle, GoogleServiceEntityMap>
  implements IConnectorGoogleService
{
  constructor() {
    super(getConnectorConfig("google"));

    const eventConfig = connectorEntityConfigs.google[GOOGLE_ENTITY_TYPES_ENUM.EVENT];
    if (!eventConfig.paginatedFetcher) {
      throw new Error("Google event config missing paginatedFetcher");
    }

    this.registerPaginatedEntityConfig<GOOGLE_ENTITY_TYPES_ENUM.EVENT, GoogleCalendarEventExternal>(
      GOOGLE_ENTITY_TYPES_ENUM.EVENT,
      {
        paginatedFetcher: eventConfig.paginatedFetcher,
        mapper: eventConfig.mapper,
        cacheTtl: eventConfig.cacheTtl,
        batchSize: eventConfig.batchSize,
        checksumEnabled: eventConfig.checksumEnabled,
      },
    );

    const calendarConfig = connectorEntityConfigs.google[GOOGLE_ENTITY_TYPES_ENUM.CALENDAR];
    this.registerEntityConfig<GOOGLE_ENTITY_TYPES_ENUM.CALENDAR, GoogleCalendarCalendarExternal>(
      GOOGLE_ENTITY_TYPES_ENUM.CALENDAR,
      {
        fetcher: calendarConfig.fetcher!,
        mapper: calendarConfig.mapper,
        cacheTtl: calendarConfig.cacheTtl,
      },
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorGoogle {
    return new ConnectorGoogle(oauth);
  }

  async fetchEvents(): Promise<GoogleCalendarEventEntity[]> {
    return this.fetchEntities(GOOGLE_ENTITY_TYPES_ENUM.EVENT, true);
  }

  async fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]> {
    return this.fetchEntities(GOOGLE_ENTITY_TYPES_ENUM.CALENDAR, true);
  }

  async getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>> {
    return this.connector.repository.event.getEventsPaginated(params);
  }

  async getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>> {
    return this.connector.repository.calendar.getCalendarsPaginated(params);
  }
}

// Backward compatibility aliases
export { ConnectorGoogleService as ConnectorGoogleCalendarService };
export type { IConnectorGoogleService as IConnectorGoogleCalendarService };
