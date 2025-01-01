import { request } from "undici";
import type { IConnectorOAuth, IConnectorOAuthConfig, IConnectorOAuthTokenResponse } from "./connector.oauth.interface";
import { ConnectorOAuthJsonParseError, ConnectorOAuthRequestError } from "./connector.oauth.errors";

export class ConnectorOAuth implements IConnectorOAuth {
  public readonly config: IConnectorOAuthConfig;

  constructor(config: IConnectorOAuthConfig) {
    this.config = config;
  }

  public async getAccessToken(code: string): Promise<IConnectorOAuthTokenResponse> {
    const formData = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri ?? "",
      grant_type: "authorization_code",
    };

    return this.postFormData<IConnectorOAuthTokenResponse>(this.config.endpoint, formData);
  }

  public async refreshAccessToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse> {
    const formData = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    return this.postFormData<IConnectorOAuthTokenResponse>(this.config.endpoint, formData);
  }

  public async revokeAccessToken(accessToken: string): Promise<void> {
    const url = `${this.config.endpoint}/revoke`;
    const formData = { token: accessToken };

    await this.postFormData<void>(url, formData);
  }

  private async postFormData<T>(url: string, formData: Record<string, string>): Promise<T> {
    const response = await request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(formData).toString(),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      const errorText = await response.body.text().catch(() => "");
      throw new ConnectorOAuthRequestError(
        response.statusCode,
        `Request failed [${response.statusCode}]: ${errorText}`,
        errorText,
      );
    }

    let parsedBody: unknown;
    const responseText = await response.body.text();
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      throw new ConnectorOAuthJsonParseError(`Invalid JSON response: ${responseText}`, responseText);
    }

    return parsedBody as T;
  }
}
