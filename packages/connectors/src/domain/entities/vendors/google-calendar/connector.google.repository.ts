import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { getOAuthData, saveOAuthData, clearOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorGoogleRepository } from "../../../../types/domain/entities/vendors/connector.google-calendar.types";
import { ConnectorGoogleCalendarEventRepository } from "./connector.google-calendar-event.repository";
import { ConnectorGoogleCalendarCalendarRepository } from "./connector.google-calendar-calendar.repository";

export class ConnectorGoogleRepository
  extends ConnectorGoogleCalendarEventRepository
  implements IConnectorGoogleRepository
{
  private _googleCalendarEventRepository: ConnectorGoogleCalendarEventRepository;
  private _googleCalendarCalendarRepository: ConnectorGoogleCalendarCalendarRepository;

  constructor() {
    super();
    this._googleCalendarEventRepository = new ConnectorGoogleCalendarEventRepository();
    this._googleCalendarCalendarRepository = new ConnectorGoogleCalendarCalendarRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "google");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("google");
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("google");
  }

  get event(): ConnectorGoogleCalendarEventRepository {
    return this._googleCalendarEventRepository;
  }

  set event(eventRepository: ConnectorGoogleCalendarEventRepository) {
    this._googleCalendarEventRepository = eventRepository;
  }

  get calendar(): ConnectorGoogleCalendarCalendarRepository {
    return this._googleCalendarCalendarRepository;
  }

  set calendar(calendarRepository: ConnectorGoogleCalendarCalendarRepository) {
    this._googleCalendarCalendarRepository = calendarRepository;
  }
}
