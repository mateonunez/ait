import { ConnectorAuthenticatorAbstract } from "../../../shared/auth/connector.authenticator.abstract";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import { ConnectorOAuthRequestError, ConnectorOAuthNetworkError } from "../../../shared/auth/lib/oauth/connector.oauth";
import { request } from "undici";

/**
 * Notion-specific authenticator that uses JSON body instead of form data
 * See: https://developers.notion.com/docs/authorization
 */
export class ConnectorNotionAuthenticator extends ConnectorAuthenticatorAbstract {
  async authenticate(code: string): Promise<IConnectorOAuthTokenResponse> {
    return this._postJson<IConnectorOAuthTokenResponse>(this.oauth.config.endpoint, {
      grant_type: "authorization_code",
      code,
      redirect_uri: this.oauth.config.redirectUri ?? "",
    });
  }

  async refreshToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse> {
    return this._postJson<IConnectorOAuthTokenResponse>(this.oauth.config.endpoint, {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });
  }

  private async _postJson<T>(url: string, body: Record<string, string>): Promise<T> {
    const basicAuth = Buffer.from(`${this.oauth.config.clientId}:${this.oauth.config.clientSecret}`).toString("base64");

    try {
      const response = await request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(body),
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        const errorText = await response.body.text().catch(() => "");
        throw new ConnectorOAuthRequestError(
          response.statusCode,
          `Request failed [${response.statusCode}]: ${errorText}`,
          errorText,
        );
      }

      const responseText = await response.body.text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(responseText);
      } catch {
        throw new ConnectorOAuthRequestError(
          response.statusCode,
          `Invalid JSON response: ${responseText}`,
          responseText,
        );
      }

      return parsedBody as T;
    } catch (error: any) {
      if (error instanceof ConnectorOAuthRequestError) {
        throw error;
      }

      throw new ConnectorOAuthNetworkError(`Network error during OAuth request: ${error.message}`, error);
    }
  }
}
