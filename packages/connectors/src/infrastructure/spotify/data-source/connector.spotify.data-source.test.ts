import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorSpotifyDataSource } from "./connector.spotify.data-source";
import { ConnectorSpotifyDataSourceError } from "./connector.spotify.data-source.errors";

describe("ConnectorSpotifyDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorSpotifyDataSource;
  let mockAccessToken: string;

  beforeEach(() => {
    agent = new MockAgent();
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorSpotifyDataSource(mockAccessToken);
  });

  it("should return a list of top tracks", async () => {
    // TODO: add missing types
    const mockResponse = {
      items: [
        { id: "1", name: "track1", artists: [{ name: "artist1" }] },
        { id: "2", name: "track2", artists: [{ name: "artist2" }] },
      ],
    };

    agent
      .get("https://api.spotify.com")
      .intercept({
        path: "/v1/me/top/tracks",
        method: "GET",
        headers: { Authorization: `Bearer ${mockAccessToken}` },
      })
      .reply(200, mockResponse);

    const result = await dataSource.fetchTopTracks();

    assert.deepEqual(result, mockResponse.items);
  });

  it("should handle invalid access token error", async () => {
    agent
      .get("https://api.spotify.com")
      .intercept({
        path: "/v1/me/top/tracks",
        method: "GET",
        headers: { Authorization: `Bearer ${mockAccessToken}` },
      })
      .reply(401, { error: { message: "Invalid access token" } });

    await assert.rejects(
      async () => {
        await dataSource.fetchTopTracks();
      },
      (error) => {
        assert.ok(error instanceof ConnectorSpotifyDataSourceError);
        assert.strictEqual(error.message, "Spotify API error: 401 Unauthorized");
        assert.strictEqual(error.responseBody, JSON.stringify({ error: { message: "Invalid access token" } }));
        return true;
      },
    );
  });
});
