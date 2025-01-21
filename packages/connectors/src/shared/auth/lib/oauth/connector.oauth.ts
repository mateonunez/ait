import { request } from "undici";

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
        Accept: "application/json",
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

export class ConnectorOAuthRequestError extends Error {
  public statusCode: number;
  public responseBody: string;

  constructor(statusCode: number, message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorOAuthRequestError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorOAuthRequestError.prototype);
  }
}

export class ConnectorOAuthJsonParseError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorOAuthJsonParseError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorOAuthJsonParseError.prototype);
  }
}
export interface IConnectorOAuthConfig {
  clientId: string;
  clientSecret: string;
  endpoint: string;
  redirectUri?: string;
}

export interface IConnectorOAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  [key: string]: unknown;
}

export interface IConnectorOAuth {
  getAccessToken(code: string): Promise<IConnectorOAuthTokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse>;
  revokeAccessToken(accessToken: string): Promise<void>;
  readonly config: IConnectorOAuthConfig;
}
