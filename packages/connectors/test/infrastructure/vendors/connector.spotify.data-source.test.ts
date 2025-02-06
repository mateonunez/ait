import {
  ConnectorSpotifyDataSource,
  ConnectorSpotifyDataSourceError,
} from "@/infrastructure/vendors/spotify/connector.spotify.data-source";
import type { SpotifyArtist, SpotifyTrack } from "@/types/domain/entities/vendors/connector.spotify.repository.types";
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";

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

  describe("tracks", () => {
    it("should return a list of top tracks", async () => {
      const mockResponse = {
        items: [
          { id: "1", name: "track1", artists: [{ name: "artist1" }], type: "track" },
          { id: "2", name: "track2", artists: [{ name: "artist2" }], type: "track" },
        ] as SpotifyTrack[],
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

  describe("artists", () => {
    it("should return a list of top artists", async () => {
      const mockResponse = {
        items: [
          { id: "1", name: "artist1", type: "artist" },
          { id: "2", name: "artist2", type: "artist" },
        ] as SpotifyArtist[],
      };

      agent
        .get("https://api.spotify.com")
        .intercept({
          path: "/v1/me/top/artists",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(200, mockResponse);

      const result = await dataSource.fetchTopArtists();

      assert.deepEqual(result, mockResponse.items);
    });

    it("should handle invalid access token error", async () => {
      agent
        .get("https://api.spotify.com")
        .intercept({
          path: "/v1/me/top/artists",
          method: "GET",
          headers: { Authorization: `Bearer ${mockAccessToken}` },
        })
        .reply(401, { error: { message: "Invalid access token" } });

      await assert.rejects(
        async () => {
          await dataSource.fetchTopArtists();
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
});
