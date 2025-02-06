import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPostgresClient, closePostgresConnection, drizzleOrm, spotifyTracks, spotifyArtists } from "@ait/postgres";
import type {
  SpotifyTrackEntity,
  SpotifyArtistEntity,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";
import { ConnectorSpotifyTrackRepository } from "@/domain/entities/vendors/spotify/connector.spotify-track.repository";
import { ConnectorSpotifyArtistRepository } from "@/domain/entities/vendors/spotify/connector.spotify-artist.repository";

describe("ConnectorSpotifyRepository", () => {
  const trackRepository: ConnectorSpotifyTrackRepository = new ConnectorSpotifyTrackRepository();
  const artistRepository: ConnectorSpotifyArtistRepository = new ConnectorSpotifyArtistRepository();
  const { db } = getPostgresClient();

  after(async () => {
    await closePostgresConnection();
  });

  describe("ConnectorSpotifyTrackRepository", () => {
    beforeEach(async () => {
      await db.delete(spotifyTracks).execute();
    });

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
        await assert.rejects(() => trackRepository.saveTrack(track), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveTracks", () => {
      it("should save multiple tracks", async () => {
        const now = new Date();
        const tracks: SpotifyTrackEntity[] = [
          {
            name: "Track 1",
            type: "track",
            artist: "Artist 1",
            album: "Album 1",
            durationMs: 60000,
            popularity: 50,
            createdAt: now,
            updatedAt: now,
          },
          {
            name: "Track 2",
            type: "track",
            artist: "Artist 2",
            album: "Album 2",
            durationMs: 60000,
            popularity: 60,
            createdAt: now,
            updatedAt: now,
          },
        ] as unknown as SpotifyTrackEntity[];

        await trackRepository.saveTracks(tracks);

        const saved = await db.select().from(spotifyTracks).execute();
        console.log("papaya", saved);
        assert.equal(saved.length, 2, "Expected two tracks to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await trackRepository.saveTracks([]);
        const saved = await db.select().from(spotifyTracks).execute();
        assert.equal(saved.length, 0, "No track should be saved for empty input");
      });
    });
  });

  describe("ConnectorSpotifyArtistRepository", () => {
    beforeEach(async () => {
      await db.delete(spotifyArtists).execute();
    });

    describe("saveArtist", () => {
      it("should save artist successfully", async () => {
        const now = new Date();
        const artist: SpotifyArtistEntity = {
          name: "Artist One",
          popularity: 70,
          genres: ["Pop", "Rock"],
          createdAt: now,
          updatedAt: now,
          type: "artist",
        } as unknown as SpotifyArtistEntity;

        await artistRepository.saveArtist(artist);

        const saved = await db
          .select()
          .from(spotifyArtists)
          .where(drizzleOrm.eq(spotifyArtists.id, artist.id))
          .execute();

        assert.equal(saved.length, 1, "Expected one artist to be saved");
        assert(saved[0] !== undefined, "Saved artist should not be undefined");
        assert.equal(saved[0].id, artist.id, "Artist ID should match");
      });

      it("should throw on missing artist ID", async () => {
        const artist = {} as SpotifyArtistEntity;
        await assert.rejects(() => artistRepository.saveArtist(artist), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveArtists", () => {
      it("should save multiple artists", async () => {
        const now = new Date();
        const artists: SpotifyArtistEntity[] = [
          {
            name: "Artist One",
            popularity: 70,
            genres: ["Pop", "Rock"],
            createdAt: now,
            updatedAt: now,
            type: "artist",
          },
          {
            name: "Artist Two",
            popularity: 80,
            genres: ["Hip Hop"],
            createdAt: now,
            updatedAt: now,
            type: "artist",
          },
        ] as unknown as SpotifyArtistEntity[];

        await artistRepository.saveArtists(artists);
        const saved = await db.select().from(spotifyArtists).execute();
        console.log("papaya", saved);
        assert.equal(saved.length, 2, "Expected two artists to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await artistRepository.saveArtists([]);
        const saved = await db.select().from(spotifyArtists).execute();
        assert.equal(saved.length, 0, "No artist should be saved for empty input");
      });
    });
  });
});
