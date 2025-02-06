import assert from "node:assert/strict";
import { MockAgent, setGlobalDispatcher } from "undici";
import { beforeEach, describe, it } from "node:test";
import { ConnectorAuthenticatorAbstract } from "@/shared/auth/connector.authenticator.abstract";
import {
  ConnectorOAuth,
  type IConnectorOAuth,
  type IConnectorOAuthConfig,
} from "@/shared/auth/lib/oauth/connector.oauth";

class ConnectorAuthenticatorConcrete extends ConnectorAuthenticatorAbstract {}

describe("ConnectorAuthenticatorAbstract", { concurrency: true }, () => {
  let agent: MockAgent;
  let oauth: IConnectorOAuth;
  let authenticator: ConnectorAuthenticatorAbstract;
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
    authenticator = new ConnectorAuthenticatorConcrete(oauth);
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
