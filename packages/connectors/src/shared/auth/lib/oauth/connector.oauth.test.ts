import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorOAuth } from "./connector.oauth";
import type { IConnectorOAuthConfig, IConnectorOAuthTokenResponse } from "./connector.oauth.interface";
import { ConnectorOAuthRequestError, ConnectorOAuthJsonParseError } from "./connector.oauth.errors";

describe("ConnectorOAuth", { concurrency: true }, () => {
  let agent: MockAgent;
  let connector: ConnectorOAuth;
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

    connector = new ConnectorOAuth(mockConfig);
  });

  it("should instantiate correctly", () => {
    assert.ok(connector);
  });

  it("should return a token response on getAccessToken", async () => {
    agent
      .get("http://example.com")
      .intercept({ path: "/", method: "POST" })
      .reply(200, { access_token: "fake-access-token" });

    const result = await connector.getAccessToken("test-code");
    assert.equal(result.access_token, "fake-access-token");
  });

  it("should return a token response on refreshAccessToken", async () => {
    agent
      .get("http://example.com")
      .intercept({ path: "/", method: "POST" })
      .reply(200, { access_token: "refreshed-access-token" });

    const result = await connector.refreshAccessToken("test-refresh-token");
    assert.equal(result.access_token, "refreshed-access-token");
  });

  it("should revoke access token without throwing", async () => {
    agent.get("http://example.com").intercept({ path: "/revoke", method: "POST" }).reply(200, {});

    await connector.revokeAccessToken("test-access-token");
    assert.ok(true);
  });

  it("should return the correct config", () => {
    assert.deepEqual(connector.config, mockConfig);
  });

  it("should throw ConnectorOAuthRequestError for non-2xx response", async () => {
    agent.get("http://example.com").intercept({ path: "/", method: "POST" }).reply(400, "Bad Request");

    await connector.getAccessToken("code").then(
      () => assert.fail("Expected error"),
      (err) => {
        assert.ok(err instanceof ConnectorOAuthRequestError);
        assert.equal(err.statusCode, 400);
      },
    );
  });

  it("should throw ConnectorOAuthJsonParseError for invalid JSON", async () => {
    agent.get("http://example.com").intercept({ path: "/", method: "POST" }).reply(200, "Not JSON");

    await connector
      .getAccessToken("code")
      .then(() => assert.fail("Expected parse error"))
      .catch((err) => {
        assert.ok(err instanceof ConnectorOAuthJsonParseError);
        assert.equal(err.responseBody, "Not JSON");
      });
  });

  it("should parse a full token response", async () => {
    const body: IConnectorOAuthTokenResponse = {
      access_token: "foo",
      token_type: "Bearer",
      expires_in: 1234,
      refresh_token: "bar",
      scope: "email profile",
    };

    agent.get("http://example.com").intercept({ path: "/", method: "POST" }).reply(200, body);

    const result = await connector.getAccessToken("code");
    assert.equal(result.access_token, "foo");
    assert.equal(result.token_type, "Bearer");
    assert.equal(result.expires_in, 1234);
    assert.equal(result.refresh_token, "bar");
    assert.equal(result.scope, "email profile");
  });
});
