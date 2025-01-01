import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorGitHubAuthenticator } from "./connector.github.authenticator";
import { ConnectorOAuth } from "../../../shared/auth/lib/oauth/connector.oauth";
import type { IConnectorOAuthConfig, IConnectorOAuthTokenResponse } from "../../../shared/auth/lib/oauth/connector.oauth.interface";

describe("ConnectorGitHubAuthenticator", { concurrency: true }, () => {
  let agent: MockAgent;
  let oauth: ConnectorOAuth;
  let authenticator: ConnectorGitHubAuthenticator;
  let mockConfig: IConnectorOAuthConfig;

  beforeEach(() => {
    agent = new MockAgent();
    setGlobalDispatcher(agent);

    mockConfig = {
      endpoint: "http://example.com",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectUri: "test-redirect-uri",
    };

    oauth = new ConnectorOAuth(mockConfig);
    authenticator = new ConnectorGitHubAuthenticator(oauth);
  });

  it("should instantiate correctly", () => {
    assert.ok(authenticator);
  });

  it("should return a token response on authenticate", async () => {
    agent
      .get("http://example.com")
      .intercept({ path: "/", method: "POST" })
      .reply(200, { access_token: "fake-access-token" });

    const result = await authenticator.authenticate("test-code");
    assert.equal(result.access_token, "fake-access-token");
  });

  it("should return a token response on refreshToken", async () => {
    agent
      .get("http://example.com")
      .intercept({ path: "/", method: "POST" })
      .reply(200, { access_token: "refreshed-access-token" });

    const result = await authenticator.refreshToken("test-refresh-token");
    assert.equal(result.access_token, "refreshed-access-token");
  });
});
