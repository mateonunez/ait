import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { clearOAuthData, getOAuthData, saveOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorLinearRepository } from "../../../../types/domain/entities/vendors/connector.linear.types";
import { ConnectorLinearIssueRepository } from "./connector.linear-issue.repository";

export class ConnectorLinearRepository extends ConnectorLinearIssueRepository implements IConnectorLinearRepository {
  private _linearIssueRepository: ConnectorLinearIssueRepository;

  constructor(
    private userId?: string,
    private connectorConfigId?: string,
  ) {
    super();
    this._linearIssueRepository = new ConnectorLinearIssueRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "linear", this.userId, this.connectorConfigId);
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("linear", this.userId);
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("linear", this.userId);
  }

  get issue(): ConnectorLinearIssueRepository {
    return this._linearIssueRepository;
  }

  set issue(issueRepository: ConnectorLinearIssueRepository) {
    this._linearIssueRepository = issueRepository;
  }
}
