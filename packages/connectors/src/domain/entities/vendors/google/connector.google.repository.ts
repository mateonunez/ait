import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { clearOAuthData, getOAuthData, saveOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorGoogleRepository } from "../../../../types/domain/entities/vendors/connector.google.types";
import { ConnectorGoogleCalendarCalendarRepository } from "./connector.google-calendar-calendar.repository";
import { ConnectorGoogleCalendarEventRepository } from "./connector.google-calendar-event.repository";
import { ConnectorGoogleYouTubeSubscriptionRepository } from "./connector.google-youtube-subscription.repository";

export class ConnectorGoogleRepository
  extends ConnectorGoogleCalendarEventRepository
  implements IConnectorGoogleRepository
{
  private _googleCalendarEventRepository: ConnectorGoogleCalendarEventRepository;
  private _googleCalendarCalendarRepository: ConnectorGoogleCalendarCalendarRepository;
  private _googleYouTubeSubscriptionRepository: ConnectorGoogleYouTubeSubscriptionRepository;

  constructor() {
    super();
    this._googleCalendarEventRepository = new ConnectorGoogleCalendarEventRepository();
    this._googleCalendarCalendarRepository = new ConnectorGoogleCalendarCalendarRepository();
    this._googleYouTubeSubscriptionRepository = new ConnectorGoogleYouTubeSubscriptionRepository();
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

  get subscription(): ConnectorGoogleYouTubeSubscriptionRepository {
    return this._googleYouTubeSubscriptionRepository;
  }

  set subscription(subscriptionRepository: ConnectorGoogleYouTubeSubscriptionRepository) {
    this._googleYouTubeSubscriptionRepository = subscriptionRepository;
  }
}
