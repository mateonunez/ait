import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { clearOAuthData, getOAuthData, saveOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorGoogleRepository } from "../../../../types/domain/entities/vendors/connector.google.types";
import { ConnectorGoogleCalendarCalendarRepository } from "./connector.google-calendar-calendar.repository";
import { ConnectorGoogleCalendarEventRepository } from "./connector.google-calendar-event.repository";
import { ConnectorGoogleContactRepository } from "./connector.google-contact.repository";
import { ConnectorGooglePhotoRepository } from "./connector.google-photos.repository";
import { ConnectorGoogleYouTubeSubscriptionRepository } from "./connector.google-youtube-subscription.repository";
import { ConnectorGoogleGmailRepository } from "./connector.google.gmail.repository";

export class ConnectorGoogleRepository implements IConnectorGoogleRepository {
  public event: ConnectorGoogleCalendarEventRepository;
  public calendar: ConnectorGoogleCalendarCalendarRepository;
  public subscription: ConnectorGoogleYouTubeSubscriptionRepository;
  public contact: ConnectorGoogleContactRepository;
  public photo: ConnectorGooglePhotoRepository;
  public gmail: ConnectorGoogleGmailRepository;

  constructor(
    private userId?: string,
    public connectorConfigId?: string,
  ) {
    this.event = new ConnectorGoogleCalendarEventRepository();
    this.calendar = new ConnectorGoogleCalendarCalendarRepository();
    this.subscription = new ConnectorGoogleYouTubeSubscriptionRepository();
    this.contact = new ConnectorGoogleContactRepository();
    this.photo = new ConnectorGooglePhotoRepository();
    this.gmail = new ConnectorGoogleGmailRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "google", this.userId, this.connectorConfigId);
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("google", this.userId);
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("google", this.userId);
  }
}
