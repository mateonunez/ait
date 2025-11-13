import type { OAuthTokenDataTarget } from "@ait/postgres";
import type { IConnectorOAuthTokenResponse } from "../../../../shared/auth/lib/oauth/connector.oauth";
import { getOAuthData, saveOAuthData, clearOAuthData } from "../../../../shared/auth/lib/oauth/connector.oauth.utils";
import type { IConnectorNotionRepository } from "../../../../types/domain/entities/vendors/connector.notion.types";
import { ConnectorNotionPageRepository } from "./connector.notion-page.repository";

export class ConnectorNotionRepository extends ConnectorNotionPageRepository implements IConnectorNotionRepository {
  private _notionPageRepository: ConnectorNotionPageRepository;

  constructor() {
    super();
    this._notionPageRepository = new ConnectorNotionPageRepository();
  }

  public async saveAuthenticationData(data: IConnectorOAuthTokenResponse): Promise<void> {
    await saveOAuthData(data, "notion");
  }

  public async getAuthenticationData(): Promise<OAuthTokenDataTarget | null> {
    return getOAuthData("notion");
  }

  public async clearAuthenticationData(): Promise<void> {
    await clearOAuthData("notion");
  }

  get page(): ConnectorNotionPageRepository {
    return this._notionPageRepository;
  }

  set page(pageRepository: ConnectorNotionPageRepository) {
    this._notionPageRepository = pageRepository;
  }
}
