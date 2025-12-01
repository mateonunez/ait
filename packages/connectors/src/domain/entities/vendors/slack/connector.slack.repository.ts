import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { clearOAuthData, getOAuthData, saveOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorSlackRepository } from "../../../../types/domain/entities/vendors/connector.slack.types";
import { ConnectorSlackMessageRepository } from "./connector.slack-message.repository";

export class ConnectorSlackRepository extends ConnectorSlackMessageRepository implements IConnectorSlackRepository {
  private _slackMessageRepository: ConnectorSlackMessageRepository;

  constructor() {
    super();
    this._slackMessageRepository = new ConnectorSlackMessageRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "slack");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("slack");
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("slack");
  }

  get message(): ConnectorSlackMessageRepository {
    return this._slackMessageRepository;
  }

  set message(messageRepository: ConnectorSlackMessageRepository) {
    this._slackMessageRepository = messageRepository;
  }
}
