import { ConnectorAuthenticatorAbstract } from "@/shared/auth/connector.authenticator.abstract";
import type { IConnectorOAuthTokenResponse } from "@/shared/auth/lib/oauth/connector.oauth";
import { createHash, randomBytes } from "node:crypto";

export class ConnectorXAuthenticator extends ConnectorAuthenticatorAbstract {
  private _pkceState: { verifier: string; challenge: string; method: string } | null = null;

  public getAuthorizationUrl(): string {
    this._pkceState = this.generatePKCEPair();
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
    console.log("baseUrl", baseUrl);
    return `${baseUrl}?${params}`;
  }

  async authenticate(code: string): Promise<IConnectorOAuthTokenResponse> {
    if (!this._pkceState) {
      throw new Error("PKCE state not initialized. Call getAuthorizationUrl first.");
    }

    this.oauth.config = {
      ...this.oauth.config,
      codeVerifier: this._pkceState.verifier,
    };

    return super.authenticate(code);
  }

  // Move to a shared util
  public generatePKCEPair(): {
    verifier: string;
    challenge: string;
    method: "S256";
  } {
    // Generate a random verifier
    const verifier = randomBytes(32).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    // Generate challenge using SHA256
    const challengeBuffer = createHash("sha256").update(verifier).digest();

    const challenge = Buffer.from(challengeBuffer)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    return { verifier, challenge, method: "S256" };
  }
}
