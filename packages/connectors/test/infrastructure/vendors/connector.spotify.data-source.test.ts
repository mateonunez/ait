import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { MockAgent, setGlobalDispatcher } from "undici";
import { ConnectorSpotifyDataSource } from "../../../src/infrastructure/vendors/spotify/connector.spotify.data-source";

describe("ConnectorSpotifyDataSource", () => {
  let agent: MockAgent;
  let dataSource: ConnectorSpotifyDataSource;
  let mockAccessToken: string;
  const spotifyEndpoint = "https://api.spotify.com";

  beforeEach(() => {
    agent = new MockAgent();
    agent.disableNetConnect(); // Add this line to prevent real network calls
    setGlobalDispatcher(agent);

    mockAccessToken = "test-access-token";
    dataSource = new ConnectorSpotifyDataSource(mockAccessToken);
  });

  describe("tracks", () => {
    it("should return a list of tracks", async () => {
      const mockResponse = {
        items: [
          {
            track: {
              added_at: "2021-01-01",
              track: {
                id: "1",
                name: "track1",
                artists: [{ name: "artist1" }],
                duration_ms: 60000,
                album: { name: "album1" },
                explicit: false,
                is_playable: true,
                preview_url: "https://example.com/preview1",
                track_number: 1,
                disc_number: 1,
                uri: "spotify:track:1",
                href: "https://api.spotify.com/v1/tracks/1",
                is_local: false,
                popularity: 50,
              },
            },
          },
        ],
      };

      const mockClient = agent.get(spotifyEndpoint);
      mockClient
        .intercept({
          path: "/v1/me/tracks?limit=50&offset=0",
          method: "GET",
          headers: {
            authorization: `Bearer ${mockAccessToken}`,
          },
        })
        .reply(200, mockResponse);

      const result = await dataSource.fetchTracks();

      assert.equal(result.items.length, 1);
      // @ts-ignore - TODO: fix this
      assert.equal(result.items[0]?.track.id, "1");
    });
  });

  describe("artists", () => {
    it("should return a list of top artists", async () => {
      const mockResponse = {
        items: [
          {
            added_at: "2021-01-01",
            track: {
              id: "1",
              name: "artist1",
              popularity: 80,
              genres: ["pop"],
              type: "artist",
            },
          },
        ],
      };

      const mockClient = agent.get(spotifyEndpoint);
      mockClient
        .intercept({
          path: "/v1/me/top/artists",
          method: "GET",
          headers: {
            authorization: `Bearer ${mockAccessToken}`,
          },
        })
        .reply(200, mockResponse);

      const result = await dataSource.fetchTopArtists();
      assert.equal(result.length, 1);
      // @ts-expect-error - TODO: fix this
      assert.equal(result[0]?.track.id, "1");
    });
  });
});
