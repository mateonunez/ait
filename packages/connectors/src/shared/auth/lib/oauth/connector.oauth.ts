import { request } from "undici";

export class ConnectorOAuth implements IConnectorOAuth {
  private _config: IConnectorOAuthConfig;

  constructor(config: IConnectorOAuthConfig) {
    this._config = config;
  }

  get config(): IConnectorOAuthConfig {
    return this._config;
  }

  set config(config: IConnectorOAuthConfig) {
    this._config = config;
  }

  public async getAccessToken(code: string): Promise<IConnectorOAuthTokenResponse> {
    const formData: Record<string, string> = {
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.redirectUri ?? "",
      grant_type: "authorization_code",
    };

    if (this.config.codeVerifier) {
      formData.code_verifier = this.config.codeVerifier;
    } else {
      // Maintain backward compatibility
      formData.client_secret = this.config.clientSecret;
    }

    return this._postFormData<IConnectorOAuthTokenResponse>(this.config.endpoint, formData);
  }

  public async refreshAccessToken(refreshToken: string): Promise<IConnectorOAuthTokenResponse> {
    const formData = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    };

    return this._postFormData<IConnectorOAuthTokenResponse>(this.config.endpoint, formData);
  }

  public async revokeAccessToken(accessToken: string): Promise<void> {
    const url = `${this.config.endpoint}/revoke`;
    const formData = { token: accessToken };

    await this._postFormData<void>(url, formData);
  }

  private async _postFormData<T>(url: string, formData: Record<string, string>): Promise<T> {
    console.log("formData", formData);
    const basicAuth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64");

    const response = await request(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
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
  codeVerifier?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
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
  get config(): IConnectorOAuthConfig;
  set config(config: IConnectorOAuthConfig);
}
