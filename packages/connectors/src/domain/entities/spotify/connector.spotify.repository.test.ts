import { describe, it, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm } from "@ait/postgres";
import { ConnectorSpotifyRepository, ConnectorSpotifyTrackRepository } from "./connector.spotify.repository";
import type { SpotifyTrackEntity } from "./connector.spotify.entities";
import { spotifyTracks } from "@ait/postgres";

describe("ConnectorSpotifyRepository", () => {
  let repository: ConnectorSpotifyRepository;
  let trackRepository: ConnectorSpotifyTrackRepository;
  const { db } = getPostgresClient();

  beforeEach(async () => {
    // Clean up existing data
    await db.delete(spotifyTracks).execute();

    trackRepository = new ConnectorSpotifyTrackRepository();
    repository = new ConnectorSpotifyRepository();
  });

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorSpotifyTrackRepository", () => {
    describe("saveTrack", () => {
      it("should save track successfully", async () => {
        const track: SpotifyTrackEntity = {
          id: "test-id",
          name: "Test Track",
          artist: "Test Artist",
          album: "Test Album",
          durationMs: 60000,
          popularity: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
          type: "track",
        };

        await trackRepository.saveTrack(track);

        const saved = await db.select().from(spotifyTracks).where(drizzleOrm.eq(spotifyTracks.id, track.id)).execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, track.id);
      });

      it("should throw on missing track ID", async () => {
        const track = {} as SpotifyTrackEntity;

        await assert.rejects(() => trackRepository.saveTrack(track), { message: "Invalid track: missing track ID" });
      });
    });

    describe("saveTracks", () => {
      it("should save multiple tracks", async () => {
        const tracks: SpotifyTrackEntity[] = [
          {
            id: "test-1",
            name: "Track 1",
            type: "track",
            artist: "Artist 1",
            album: "Album 1",
            durationMs: 60000,
            popularity: 50,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "test-2",
            name: "Track 2",
            type: "track",
            artist: "Artist 2",
            album: "Album 2",
            durationMs: 60000,
            popularity: 60,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        await trackRepository.saveTracks(tracks);

        const saved = await db.select().from(spotifyTracks).execute();
        assert.equal(saved.length, 2);
      });

      it("should do nothing with empty array", async () => {
        await trackRepository.saveTracks([]);
        const saved = await db.select().from(spotifyTracks).execute();
        assert.equal(saved.length, 0);
      });
    });
  });
});
