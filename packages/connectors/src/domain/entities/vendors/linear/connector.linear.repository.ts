import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { getOAuthData, saveOAuthData } from "@/shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorLinearRepository } from "@/types/domain/entities/vendors/connector.linear.types";
import { ConnectorLinearIssueRepository } from "./connector.linear-issue.repository";

export class ConnectorLinearRepository extends ConnectorLinearIssueRepository implements IConnectorLinearRepository {
  private _linearIssueRepository: ConnectorLinearIssueRepository;

  constructor() {
    super();
    this._linearIssueRepository = new ConnectorLinearIssueRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    saveOAuthData(data, "linear");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("linear");
  }

  get issue(): ConnectorLinearIssueRepository {
    return this._linearIssueRepository;
  }

  set issue(issueRepository: ConnectorLinearIssueRepository) {
    this._linearIssueRepository = issueRepository;
  }
}
