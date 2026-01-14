import type { GoogleEntityType } from "@ait/core";
import { AItError } from "@ait/core";
import type {
  GmailMessageEntity,
  GoogleCalendarCalendarEntity,
  GoogleCalendarEventEntity,
  GoogleContactEntity,
  GooglePhotoEntity,
  GoogleYouTubeSubscriptionEntity,
} from "@ait/core";
import type { OAuthTokenDataTarget } from "@ait/postgres";
import { GOOGLE_ENTITY_TYPES_ENUM } from "../../../services/vendors/connector.vendors.config";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorGoogleRepository } from "../../../types/domain/entities/vendors/connector.google.types";
import type { IConnectorStore } from "../../../types/shared/store/connector.store.interface";

export class ConnectorGoogleStore implements IConnectorStore {
  private _ConnectorGoogleRepository: IConnectorGoogleRepository;

  constructor(ConnectorGoogleRepository: IConnectorGoogleRepository) {
    this._ConnectorGoogleRepository = ConnectorGoogleRepository;
  }

  async save<T extends GoogleEntityType>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case GOOGLE_ENTITY_TYPES_ENUM.EVENT:
          await this._ConnectorGoogleRepository.event.saveEvent(item as unknown as GoogleCalendarEventEntity, {
            incremental: false,
          });
          break;
        case GOOGLE_ENTITY_TYPES_ENUM.CALENDAR:
          await this._ConnectorGoogleRepository.calendar.saveCalendar(item as unknown as GoogleCalendarCalendarEntity, {
            incremental: false,
          });
          break;
        case GOOGLE_ENTITY_TYPES_ENUM.SUBSCRIPTION:
          await this._ConnectorGoogleRepository.subscription.saveSubscription(
            item as unknown as GoogleYouTubeSubscriptionEntity,
            {
              incremental: false,
            },
          );
          break;
        case GOOGLE_ENTITY_TYPES_ENUM.CONTACT:
          await this._ConnectorGoogleRepository.contact.saveContact(item as unknown as GoogleContactEntity, {
            incremental: false,
          });
          break;
        case GOOGLE_ENTITY_TYPES_ENUM.PHOTO:
          await this._ConnectorGoogleRepository.photo.savePhoto(item as unknown as GooglePhotoEntity, {
            incremental: false,
          });
          break;
        case GOOGLE_ENTITY_TYPES_ENUM.MESSAGE:
          await this._ConnectorGoogleRepository.gmail.saveEntities(
            [item as unknown as GmailMessageEntity],
            (item as { connectorConfigId?: string }).connectorConfigId ||
              this._ConnectorGoogleRepository.connectorConfigId ||
              "",
          );
          break;
        default:
          // @ts-ignore: Unreachable code error
          throw new AItError("STORE_UNSUPPORTED_TYPE", `Type ${item.__type} is not supported`);
      }
    }
  }

  async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await this._ConnectorGoogleRepository.saveAuthenticationData(data);
  }

  async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return this._ConnectorGoogleRepository.getAuthenticationData();
  }

  private _resolveItems<T extends GoogleEntityType>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
