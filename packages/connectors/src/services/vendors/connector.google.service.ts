import type {
  GoogleCalendarCalendarExternal,
  GoogleCalendarEventExternal,
  GoogleContactExternal,
  GooglePhotoExternal,
  GoogleYouTubeSubscriptionExternal,
  PaginatedResponse,
  PaginationParams,
} from "@ait/core";
import { getLogger } from "@ait/core";
import { photoStorageService } from "@ait/storage";
import type {
  GoogleCalendarCalendarEntity,
  GoogleCalendarEventEntity,
} from "../../domain/entities/google/google-calendar.entity";
import type { GoogleContactEntity } from "../../domain/entities/google/google-contact.entity";
import {
  type GooglePhotoEntity,
  type PickerPhotoInput,
  mapGooglePickerPhoto,
} from "../../domain/entities/google/google-photo.entity";
import type { GoogleYouTubeSubscriptionEntity } from "../../domain/entities/google/google-youtube.entity";
import { ConnectorGoogle } from "../../infrastructure/vendors/google/connector.google";
import type { ConnectorOAuth } from "../../shared/auth/lib/oauth/connector.oauth";
import { getOAuthData } from "../../shared/auth/lib/oauth/connector.oauth.utils";
import { ConnectorServiceBase } from "../connector.service.base.abstract";
import { getConnectorConfig } from "../connector.service.config";
import {
  GOOGLE_ENTITY_TYPES_ENUM,
  type GoogleServiceEntityMap,
  connectorEntityConfigs,
} from "./connector.vendors.config";

export interface IConnectorGoogleService extends ConnectorServiceBase<ConnectorGoogle, GoogleServiceEntityMap> {
  fetchEvents(): Promise<GoogleCalendarEventEntity[]>;
  fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]>;
  fetchSubscriptions(): Promise<GoogleYouTubeSubscriptionEntity[]>;
  fetchContacts(): Promise<GoogleContactEntity[]>;
  fetchPhotos(): Promise<GooglePhotoEntity[]>;
  getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>>;
  getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>>;
  getSubscriptionsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleYouTubeSubscriptionEntity>>;
  getContactsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleContactEntity>>;
  getPhotosPaginated(params: PaginationParams): Promise<PaginatedResponse<GooglePhotoEntity>>;
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

    const subscriptionConfig = connectorEntityConfigs.google[GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION];
    if (!subscriptionConfig.paginatedFetcher) {
      throw new Error("Google subscription config missing paginatedFetcher");
    }

    this.registerPaginatedEntityConfig<GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION, GoogleYouTubeSubscriptionExternal>(
      GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION,
      {
        paginatedFetcher: subscriptionConfig.paginatedFetcher,
        mapper: subscriptionConfig.mapper,
        cacheTtl: subscriptionConfig.cacheTtl,
        batchSize: subscriptionConfig.batchSize,
        checksumEnabled: subscriptionConfig.checksumEnabled,
      },
    );

    const contactConfig = connectorEntityConfigs.google[GOOGLE_ENTITY_TYPES_ENUM.CONTACT];
    if (!contactConfig.paginatedFetcher) {
      throw new Error("Google contact config missing paginatedFetcher");
    }

    this.registerPaginatedEntityConfig<GOOGLE_ENTITY_TYPES_ENUM.CONTACT, GoogleContactExternal>(
      GOOGLE_ENTITY_TYPES_ENUM.CONTACT,
      {
        paginatedFetcher: contactConfig.paginatedFetcher,
        mapper: contactConfig.mapper,
        cacheTtl: contactConfig.cacheTtl,
        batchSize: contactConfig.batchSize,
        checksumEnabled: contactConfig.checksumEnabled,
      },
    );

    const photoConfig = connectorEntityConfigs.google[GOOGLE_ENTITY_TYPES_ENUM.PHOTO];
    if (!photoConfig.paginatedFetcher) {
      throw new Error("Google photo config missing paginatedFetcher");
    }

    this.registerPaginatedEntityConfig<GOOGLE_ENTITY_TYPES_ENUM.PHOTO, GooglePhotoExternal>(
      GOOGLE_ENTITY_TYPES_ENUM.PHOTO,
      {
        paginatedFetcher: photoConfig.paginatedFetcher,
        mapper: photoConfig.mapper,
        cacheTtl: photoConfig.cacheTtl,
        batchSize: photoConfig.batchSize,
        checksumEnabled: photoConfig.checksumEnabled,
      },
    );
  }

  protected createConnector(oauth: ConnectorOAuth): ConnectorGoogle {
    return new ConnectorGoogle(oauth);
  }

  async fetchEvents(): Promise<GoogleCalendarEventEntity[]> {
    return this.fetchEntities(GOOGLE_ENTITY_TYPES_ENUM.EVENT, true);
  }

  async fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]>;
  async fetchCalendars(): Promise<GoogleCalendarCalendarEntity[]> {
    return this.fetchEntities(GOOGLE_ENTITY_TYPES_ENUM.CALENDAR, true);
  }

  async fetchSubscriptions(): Promise<GoogleYouTubeSubscriptionEntity[]> {
    return this.fetchEntities(GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION, true);
  }

  async fetchContacts(): Promise<GoogleContactEntity[]> {
    return this.fetchEntities(GOOGLE_ENTITY_TYPES_ENUM.CONTACT, true);
  }

  async fetchPhotos(): Promise<GooglePhotoEntity[]> {
    return this.fetchEntities(GOOGLE_ENTITY_TYPES_ENUM.PHOTO, true);
  }

  async getEventsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarEventEntity>> {
    return this.connector.repository.event.getEventsPaginated(params);
  }

  async getCalendarsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleCalendarCalendarEntity>> {
    return this.connector.repository.calendar.getCalendarsPaginated(params);
  }

  async getSubscriptionsPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResponse<GoogleYouTubeSubscriptionEntity>> {
    return this.connector.repository.subscription.getSubscriptionsPaginated(params);
  }

  async getContactsPaginated(params: PaginationParams): Promise<PaginatedResponse<GoogleContactEntity>> {
    return this.connector.repository.contact.getContactsPaginated(params);
  }

  async getPhotosPaginated(params: PaginationParams): Promise<PaginatedResponse<GooglePhotoEntity>> {
    return this.connector.repository.photo.getPhotosPaginated(params);
  }

  async createPickerSession(): Promise<any> {
    await this.connector.connect();
    return this.connector.dataSource.createPickerSession();
  }

  async getPickerSession(id: string): Promise<any> {
    await this.connector.connect();
    return this.connector.dataSource.getPickerSession(id);
  }

  async listPickerMediaItems(id: string): Promise<PickerPhotoInput[]> {
    await this.connector.connect();
    return this.connector.dataSource.listPickerMediaItems(id);
  }

  async importPickerMediaItems(id: string): Promise<void> {
    const logger = getLogger();
    const items = await this.listPickerMediaItems(id);
    if (!items.length) return;

    const oauthData = await getOAuthData("google");
    const accessToken = oauthData?.accessToken || undefined;

    if (!accessToken) {
      logger.warn("No access token available for photo downloads");
    }

    const downloadOptions = items
      .filter((item) => item.mediaFile?.baseUrl)
      .map((item) => ({
        id: item.id,
        baseUrl: item.mediaFile.baseUrl,
        filename: item.mediaFile.filename || `${item.id}.jpg`,
        mimeType: item.mediaFile.mimeType || "image/jpeg",
        accessToken,
      }));

    const downloadResults = await photoStorageService.downloadBatch(downloadOptions);

    let successCount = 0;
    for (const result of downloadResults.values()) {
      if (result.success) successCount++;
    }

    const entities = items.map((item) => {
      const result = downloadResults.get(item.id);
      return mapGooglePickerPhoto(item, result?.localPath);
    });

    logger.info(`Imported ${entities.length} photos, ${successCount} downloaded successfully`);
    await this.connector.store.save(entities);
  }
}

export { ConnectorGoogleService as ConnectorGoogleCalendarService };
export type { IConnectorGoogleService as IConnectorGoogleCalendarService };
