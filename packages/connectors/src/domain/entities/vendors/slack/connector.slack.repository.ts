import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { clearOAuthData, getOAuthData, saveOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorSlackRepository } from "../../../../types/domain/entities/vendors/connector.slack.types";
import { ConnectorSlackMessageRepository } from "./connector.slack-message.repository";

export class ConnectorSlackRepository extends ConnectorSlackMessageRepository implements IConnectorSlackRepository {
  private _slackMessageRepository: ConnectorSlackMessageRepository;

  constructor(
    private userId?: string,
    private connectorConfigId?: string,
  ) {
    super();
    this._slackMessageRepository = new ConnectorSlackMessageRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "slack", this.userId, this.connectorConfigId);
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("slack", this.userId);
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("slack", this.userId);
  }

  get message(): ConnectorSlackMessageRepository {
    return this._slackMessageRepository;
  }

  set message(messageRepository: ConnectorSlackMessageRepository) {
    this._slackMessageRepository = messageRepository;
  }
}
