import { ConnectorAuthenticatorAbstract } from "../../../shared/auth/connector.authenticator.abstract";
import { AItError } from "@ait/core";
import type { IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth";
import { randomBytes } from "node:crypto";
import { generatePkcePair } from "../../../shared/auth/pkce.util";

export class ConnectorXAuthenticator extends ConnectorAuthenticatorAbstract {
  private _pkceState: { verifier: string; challenge: string; method: string } | null = null;

  public getAuthorizationUrl(): string {
    this._pkceState = generatePkcePair();
    const { verifier, challenge, method } = this._pkceState;

    // Update OAuth config with PKCE verifier
    this.oauth.config = {
      ...this.oauth.config,
      codeVerifier: verifier,
    };

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.oauth.config.clientId,
      redirect_uri: this.oauth.config.redirectUri!,
      code_challenge: challenge,
      code_challenge_method: method,
      scope: "tweet.read users.read offline.access",
      state: randomBytes(16).toString("hex"),
    });

    const baseUrl = process.env.X_AUTH_URL!;
    return `${baseUrl}?${params}`;
  }

  async authenticate(code: string): Promise<IConnectorOAuthTokenResponse> {
    if (!this._pkceState) {
      throw new AItError("PKCE_NOT_INITIALIZED", "PKCE state not initialized. Call getAuthorizationUrl first.");
    }

    this.oauth.config = {
      ...this.oauth.config,
      codeVerifier: this._pkceState.verifier,
    };

    return super.authenticate(code);
  }
}
