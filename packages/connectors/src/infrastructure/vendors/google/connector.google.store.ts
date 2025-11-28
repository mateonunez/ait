import type { GoogleCalendarEntity } from "@ait/core";
import { AItError } from "@ait/core";
import type { IConnectorGoogleRepository } from "../../../types/domain/entities/vendors/connector.google-calendar.types";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorStore } from "../../../types/shared/store/connector.store.interface";
import { GOOGLE_ENTITY_TYPES_ENUM } from "../../../services/vendors/connector.vendors.config";
import type { OAuthTokenDataTarget } from "@ait/postgres";

export class ConnectorGoogleStore implements IConnectorStore {
  private _ConnectorGoogleRepository: IConnectorGoogleRepository;

  constructor(ConnectorGoogleRepository: IConnectorGoogleRepository) {
    this._ConnectorGoogleRepository = ConnectorGoogleRepository;
  }

  async save<T extends GoogleCalendarEntity>(data: T | T[]): Promise<void> {
    const items = this._resolveItems(data);

    for (const item of items) {
      switch (item.__type) {
        case GOOGLE_ENTITY_TYPES_ENUM.EVENT:
          await this._ConnectorGoogleRepository.event.saveEvent(item as any, { incremental: false });
          break;
        case GOOGLE_ENTITY_TYPES_ENUM.CALENDAR:
          await this._ConnectorGoogleRepository.calendar.saveCalendar(item as any, { incremental: false });
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

  private _resolveItems<T extends GoogleCalendarEntity>(data: T | T[]): T[] {
    return Array.isArray(data) ? data : [data];
  }
}
