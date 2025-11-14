import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getPostgresClient,
  closePostgresConnection,
  drizzleOrm,
  spotifyTracks,
  spotifyArtists,
  spotifyPlaylists,
  spotifyAlbums,
  spotifyRecentlyPlayed,
} from "@ait/postgres";
import type {
  SpotifyTrackEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyAlbumEntity,
  SpotifyRecentlyPlayedEntity,
} from "../../../../src/types/domain/entities/vendors/connector.spotify.types";
import { ConnectorSpotifyTrackRepository } from "../../../../src/domain/entities/vendors/spotify/connector.spotify-track.repository";
import { ConnectorSpotifyArtistRepository } from "../../../../src/domain/entities/vendors/spotify/connector.spotify-artist.repository";
import { ConnectorSpotifyPlaylistRepository } from "../../../../src/domain/entities/vendors/spotify/connector.spotify-playlist.repository";
import { ConnectorSpotifyAlbumRepository } from "../../../../src/domain/entities/vendors/spotify/connector.spotify-album.repository";
import { ConnectorSpotifyRecentlyPlayedRepository } from "../../../../src/domain/entities/vendors/spotify/connector.spotify-recently-played.repository";

describe("ConnectorSpotifyRepository", () => {
  const trackRepository: ConnectorSpotifyTrackRepository = new ConnectorSpotifyTrackRepository();
  const artistRepository: ConnectorSpotifyArtistRepository = new ConnectorSpotifyArtistRepository();
  const playlistRepository: ConnectorSpotifyPlaylistRepository = new ConnectorSpotifyPlaylistRepository();
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
          // New fields
          explicit: false,
          isPlayable: true,
          previewUrl: "https://example.com/preview",
          trackNumber: 1,
          discNumber: 1,
          uri: "spotify:track:test-id",
          href: "https://api.spotify.com/v1/tracks/test-id",
          isLocal: false,
          albumData: { name: "Test Album", id: "album-id" },
          artistsData: [{ name: "Test Artist", id: "artist-id" }],
          externalIds: { isrc: "TEST123" },
          externalUrls: { spotify: "https://open.spotify.com/track/test-id" },
          addedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          __type: "track",
        };

        await trackRepository.saveTrack(track);

        const saved = await db.select().from(spotifyTracks).where(drizzleOrm.eq(spotifyTracks.id, track.id)).execute();
        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, track.id);
        assert.equal(saved[0].explicit, track.explicit);
        assert.equal(saved[0].isPlayable, track.isPlayable);
        assert.equal(saved[0].previewUrl, track.previewUrl);
        assert.equal(saved[0].trackNumber, track.trackNumber);
        assert.equal(saved[0].discNumber, track.discNumber);
        assert.equal(saved[0].uri, track.uri);
        assert.equal(saved[0].href, track.href);
        assert.equal(saved[0].isLocal, track.isLocal);
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
            id: "track-1",
            name: "Track 1",
            artist: "Artist 1",
            album: "Album 1",
            durationMs: 60000,
            popularity: 50,
            explicit: true,
            isPlayable: true,
            previewUrl: "https://example.com/preview1",
            trackNumber: 1,
            discNumber: 1,
            uri: "spotify:track:track-1",
            href: "https://api.spotify.com/v1/tracks/track-1",
            isLocal: false,
            albumData: { name: "Album 1", id: "album-1" },
            artistsData: [{ name: "Artist 1", id: "artist-1" }],
            externalIds: { isrc: "TEST1" },
            externalUrls: { spotify: "https://open.spotify.com/track/track-1" },
            addedAt: now,
            createdAt: now,
            updatedAt: now,
            __type: "track",
          },
          {
            id: "track-2",
            name: "Track 2",
            artist: "Artist 2",
            album: "Album 2",
            durationMs: 60000,
            popularity: 60,
            explicit: false,
            isPlayable: true,
            previewUrl: "https://example.com/preview2",
            trackNumber: 2,
            discNumber: 1,
            uri: "spotify:track:track-2",
            href: "https://api.spotify.com/v1/tracks/track-2",
            isLocal: false,
            albumData: { name: "Album 2", id: "album-2" },
            artistsData: [{ name: "Artist 2", id: "artist-2" }],
            externalIds: { isrc: "TEST2" },
            externalUrls: { spotify: "https://open.spotify.com/track/track-2" },
            addedAt: now,
            createdAt: now,
            updatedAt: now,
            __type: "track",
          },
        ];

        await trackRepository.saveTracks(tracks);

        const saved = await db.select().from(spotifyTracks).execute();
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
          id: "test-id",
          name: "Artist One",
          popularity: 70,
          genres: ["Pop", "Rock"],
          createdAt: now,
          updatedAt: now,
          __type: "artist",
        } as SpotifyArtistEntity;

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
            id: "artist-1",
            name: "Artist One",
            popularity: 70,
            genres: ["Pop", "Rock"],
            createdAt: now,
            updatedAt: now,
            __type: "artist",
          },
          {
            id: "artist-2",
            name: "Artist Two",
            popularity: 80,
            genres: ["Hip Hop"],
            createdAt: now,
            updatedAt: now,
            __type: "artist",
          },
        ] as SpotifyArtistEntity[];

        await artistRepository.saveArtists(artists);
        const saved = await db.select().from(spotifyArtists).execute();
        assert.equal(saved.length, 2, "Expected two artists to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await artistRepository.saveArtists([]);
        const saved = await db.select().from(spotifyArtists).execute();
        assert.equal(saved.length, 0, "No artist should be saved for empty input");
      });
    });
  });

  describe("ConnectorSpotifyPlaylistRepository", () => {
    beforeEach(async () => {
      await db.delete(spotifyPlaylists).execute();
    });

    describe("savePlaylist", () => {
      it("should save playlist successfully", async () => {
        const now = new Date();
        const playlist: SpotifyPlaylistEntity = {
          id: "test-playlist-id",
          name: "Test Playlist",
          description: "Test Description",
          public: true,
          collaborative: false,
          owner: "test-user",
          snapshotId: "test-snapshot-id",
          uri: "spotify:playlist:test-playlist-id",
          href: "https://api.spotify.com/v1/playlists/test-playlist-id",
          images: null,
          createdAt: now,
          updatedAt: now,
          __type: "playlist",
          tracks: [],
          followers: 0,
          externalUrls: [],
        };

        await playlistRepository.savePlaylist(playlist);

        const saved = await db
          .select()
          .from(spotifyPlaylists)
          .where(drizzleOrm.eq(spotifyPlaylists.id, playlist.id))
          .execute();

        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, playlist.id);
        assert.equal(saved[0].name, playlist.name);
        assert.equal(saved[0].description, playlist.description);
        assert.equal(saved[0].public, playlist.public);
        assert.equal(saved[0].collaborative, playlist.collaborative);
        assert.equal(saved[0].owner, playlist.owner);
        assert.equal(saved[0].snapshotId, playlist.snapshotId);
        assert.equal(saved[0].uri, playlist.uri);
        assert.equal(saved[0].href, playlist.href);
      });

      it("should throw on missing playlist ID", async () => {
        const playlist = {} as SpotifyPlaylistEntity;
        await assert.rejects(() => playlistRepository.savePlaylist(playlist), {
          message: /Failed to save/,
        });
      });
    });

    describe("savePlaylists", () => {
      it("should save multiple playlists", async () => {
        const now = new Date();
        const playlists: SpotifyPlaylistEntity[] = [
          {
            id: "playlist-1",
            name: "Playlist One",
            description: "First Test Playlist",
            public: true,
            collaborative: false,
            owner: "user-1",
            snapshotId: "snapshot-1",
            uri: "spotify:playlist:playlist-1",
            href: "https://api.spotify.com/v1/playlists/playlist-1",
            images: null,
            createdAt: now,
            updatedAt: now,
            __type: "playlist",
            tracks: [],
            followers: 0,
            externalUrls: [],
          },
          {
            id: "playlist-2",
            name: "Playlist Two",
            description: "Second Test Playlist",
            public: false,
            collaborative: true,
            owner: "user-2",
            snapshotId: "snapshot-2",
            uri: "spotify:playlist:playlist-2",
            href: "https://api.spotify.com/v1/playlists/playlist-2",
            images: null,
            createdAt: now,
            updatedAt: now,
            __type: "playlist",
            tracks: [],
            followers: 0,
            externalUrls: [],
          },
        ];

        await playlistRepository.savePlaylists(playlists);

        const saved = await db.select().from(spotifyPlaylists).execute();
        assert.equal(saved.length, 2, "Expected two playlists to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await playlistRepository.savePlaylists([]);
        const saved = await db.select().from(spotifyPlaylists).execute();
        assert.equal(saved.length, 0, "No playlist should be saved for empty input");
      });
    });
  });

  describe("ConnectorSpotifyAlbumRepository", () => {
    const albumRepository: ConnectorSpotifyAlbumRepository = new ConnectorSpotifyAlbumRepository();

    beforeEach(async () => {
      await db.delete(spotifyAlbums).execute();
    });

    describe("saveAlbum", () => {
      it("should save album successfully", async () => {
        const now = new Date();
        const album: SpotifyAlbumEntity = {
          id: "test-album-id",
          name: "Test Album",
          albumType: "album",
          artists: [],
          tracks: [],
          totalTracks: 2,
          releaseDate: "2024-03-15",
          releaseDatePrecision: "day",
          isPlayable: true,
          uri: "spotify:album:test-album-id",
          href: "https://api.spotify.com/v1/albums/test-album-id",
          popularity: 75,
          label: "Test Label",
          copyrights: [],
          genres: ["Pop", "Rock"],
          images: null,
          createdAt: now,
          updatedAt: now,
          __type: "album",
          externalIds: [],
        };

        await albumRepository.saveAlbum(album);

        const saved = await db.select().from(spotifyAlbums).where(drizzleOrm.eq(spotifyAlbums.id, album.id)).execute();

        assert.equal(saved.length, 1);
      });

      it("should throw on missing album ID", async () => {
        const album = {} as SpotifyAlbumEntity;
        await assert.rejects(() => albumRepository.saveAlbum(album), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveAlbums", () => {
      it("should save multiple albums", async () => {
        const now = new Date();
        const albums: SpotifyAlbumEntity[] = [
          {
            id: "album-1",
            name: "Album One",
            albumType: "album",
            artists: [],
            tracks: [],
            totalTracks: 1,
            releaseDate: "2024-03-15",
            releaseDatePrecision: "day",
            isPlayable: true,
            uri: "spotify:album:album-1",
            href: "https://api.spotify.com/v1/albums/album-1",
            popularity: 65,
            label: "Label One",
            copyrights: [],
            externalIds: [],
            genres: ["Pop"],
            images: null,
            createdAt: now,
            updatedAt: now,
            __type: "album",
          },
          {
            id: "album-2",
            name: "Album Two",
            albumType: "single",
            artists: [],
            tracks: [],
            totalTracks: 1,
            releaseDate: "2024-03-16",
            releaseDatePrecision: "day",
            isPlayable: true,
            uri: "spotify:album:album-2",
            href: "https://api.spotify.com/v1/albums/album-2",
            popularity: 70,
            label: "Label Two",
            copyrights: [],
            externalIds: [],
            genres: ["Rock"],
            images: null,
            createdAt: now,
            updatedAt: now,
            __type: "album",
          },
        ];

        await albumRepository.saveAlbums(albums);

        const saved = await db.select().from(spotifyAlbums).execute();
        assert.equal(saved.length, 2, "Expected two albums to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await albumRepository.saveAlbums([]);
        const saved = await db.select().from(spotifyAlbums).execute();
        assert.equal(saved.length, 0, "No album should be saved for empty input");
      });
    });
  });

  describe("ConnectorSpotifyRecentlyPlayedRepository", () => {
    const recentlyPlayedRepository: ConnectorSpotifyRecentlyPlayedRepository =
      new ConnectorSpotifyRecentlyPlayedRepository();

    beforeEach(async () => {
      await db.delete(spotifyRecentlyPlayed).execute();
    });

    describe("saveRecentlyPlayed", () => {
      it("should save recently played item successfully", async () => {
        const now = new Date();
        const playedAt = new Date(now.getTime() - 60000); // 1 minute ago
        const recentlyPlayed: SpotifyRecentlyPlayedEntity = {
          id: `track-1-${playedAt.toISOString()}`,
          trackId: "track-1",
          trackName: "Test Track",
          artist: "Test Artist",
          album: "Test Album",
          durationMs: 180000,
          explicit: false,
          popularity: 75,
          playedAt: playedAt,
          context: {
            type: "playlist",
            uri: "spotify:playlist:test-playlist",
          },
          albumData: null,
          createdAt: now,
          updatedAt: now,
          __type: "recently_played",
        };

        await recentlyPlayedRepository.saveRecentlyPlayed(recentlyPlayed);

        const saved = await db
          .select()
          .from(spotifyRecentlyPlayed)
          .where(drizzleOrm.eq(spotifyRecentlyPlayed.id, recentlyPlayed.id))
          .execute();

        assert.equal(saved.length, 1);
        assert(saved[0] !== undefined);
        assert.equal(saved[0].id, recentlyPlayed.id);
        assert.equal(saved[0].trackId, recentlyPlayed.trackId);
        assert.equal(saved[0].trackName, recentlyPlayed.trackName);
        assert.equal(saved[0].artist, recentlyPlayed.artist);
        assert.equal(saved[0].album, recentlyPlayed.album);
        assert.equal(saved[0].durationMs, recentlyPlayed.durationMs);
        assert.equal(saved[0].explicit, recentlyPlayed.explicit);
        assert.equal(saved[0].popularity, recentlyPlayed.popularity);
      });

      it("should update existing recently played item on conflict", async () => {
        const now = new Date();
        const playedAt = new Date(now.getTime() - 60000);
        const recentlyPlayed: SpotifyRecentlyPlayedEntity = {
          id: `track-1-${playedAt.toISOString()}`,
          trackId: "track-1",
          trackName: "Test Track",
          artist: "Test Artist",
          album: "Test Album",
          durationMs: 180000,
          explicit: false,
          popularity: 75,
          playedAt: playedAt,
          context: null,
          albumData: null,
          createdAt: now,
          updatedAt: now,
          __type: "recently_played",
        };

        // Save first time
        await recentlyPlayedRepository.saveRecentlyPlayed(recentlyPlayed);

        // Update with new data
        const updatedItem: SpotifyRecentlyPlayedEntity = {
          ...recentlyPlayed,
          trackName: "Updated Track Name",
          popularity: 85,
        };

        await recentlyPlayedRepository.saveRecentlyPlayed(updatedItem);

        const saved = await db
          .select()
          .from(spotifyRecentlyPlayed)
          .where(drizzleOrm.eq(spotifyRecentlyPlayed.id, recentlyPlayed.id))
          .execute();

        assert.equal(saved.length, 1);
        assert.equal(saved[0]?.trackName, "Updated Track Name");
        assert.equal(saved[0]?.popularity, 85);
      });

      it("should throw on missing recently played ID", async () => {
        const recentlyPlayed = {} as SpotifyRecentlyPlayedEntity;
        await assert.rejects(() => recentlyPlayedRepository.saveRecentlyPlayed(recentlyPlayed), {
          message: /Failed to save/,
        });
      });
    });

    describe("saveRecentlyPlayedBatch", () => {
      it("should save multiple recently played items", async () => {
        const now = new Date();
        const items: SpotifyRecentlyPlayedEntity[] = [
          {
            id: `track-1-${now.toISOString()}`,
            trackId: "track-1",
            trackName: "Track One",
            artist: "Artist One",
            album: "Album One",
            durationMs: 200000,
            explicit: false,
            popularity: 70,
            playedAt: new Date(now.getTime() - 120000), // 2 minutes ago
            context: {
              type: "playlist",
              uri: "spotify:playlist:playlist-1",
            },
            albumData: null,
            createdAt: now,
            updatedAt: now,
            __type: "recently_played",
          },
          {
            id: `track-2-${now.toISOString()}`,
            trackId: "track-2",
            trackName: "Track Two",
            artist: "Artist Two",
            album: "Album Two",
            durationMs: 180000,
            explicit: true,
            popularity: 80,
            playedAt: new Date(now.getTime() - 60000), // 1 minute ago
            context: {
              type: "album",
              uri: "spotify:album:album-2",
            },
            albumData: null,
            createdAt: now,
            updatedAt: now,
            __type: "recently_played",
          },
        ];

        await recentlyPlayedRepository.saveRecentlyPlayedBatch(items);

        const saved = await db.select().from(spotifyRecentlyPlayed).execute();
        assert.equal(saved.length, 2, "Expected two recently played items to be saved");
      });

      it("should do nothing if empty array is provided", async () => {
        await recentlyPlayedRepository.saveRecentlyPlayedBatch([]);
        const saved = await db.select().from(spotifyRecentlyPlayed).execute();
        assert.equal(saved.length, 0, "No recently played item should be saved for empty input");
      });
    });

    describe("getRecentlyPlayed", () => {
      it("should retrieve recently played items ordered by playedAt", async () => {
        const now = new Date();
        const items: SpotifyRecentlyPlayedEntity[] = [
          {
            id: "track-1-old",
            trackId: "track-1",
            trackName: "Old Track",
            artist: "Artist One",
            album: "Album One",
            durationMs: 200000,
            explicit: false,
            popularity: 70,
            playedAt: new Date(now.getTime() - 300000), // 5 minutes ago
            context: null,
            albumData: null,
            createdAt: now,
            updatedAt: now,
            __type: "recently_played",
          },
          {
            id: "track-2-recent",
            trackId: "track-2",
            trackName: "Recent Track",
            artist: "Artist Two",
            album: "Album Two",
            durationMs: 180000,
            explicit: true,
            popularity: 80,
            playedAt: new Date(now.getTime() - 60000), // 1 minute ago
            context: null,
            albumData: null,
            createdAt: now,
            updatedAt: now,
            __type: "recently_played",
          },
        ];

        await recentlyPlayedRepository.saveRecentlyPlayedBatch(items);

        const retrieved = await recentlyPlayedRepository.fetchRecentlyPlayed(10);
        assert.equal(retrieved.length, 2);
        // Most recent should be first
        assert.equal(retrieved[0]?.trackName, "Recent Track");
        assert.equal(retrieved[1]?.trackName, "Old Track");
      });

      it("should respect the limit parameter", async () => {
        const now = new Date();
        const items: SpotifyRecentlyPlayedEntity[] = Array.from({ length: 5 }, (_, i) => ({
          id: `track-${i}-${now.toISOString()}`,
          trackId: `track-${i}`,
          trackName: `Track ${i}`,
          artist: `Artist ${i}`,
          album: `Album ${i}`,
          durationMs: 180000,
          explicit: false,
          popularity: 70,
          playedAt: new Date(now.getTime() - i * 60000), // i minutes ago
          context: null,
          albumData: null,
          createdAt: now,
          updatedAt: now,
          __type: "recently_played",
        }));

        await recentlyPlayedRepository.saveRecentlyPlayedBatch(items);

        const retrieved = await recentlyPlayedRepository.fetchRecentlyPlayed(3);
        assert.equal(retrieved.length, 3, "Should return only 3 items");
      });
    });

    describe("getRecentlyPlayedById", () => {
      it("should retrieve a specific recently played item by ID", async () => {
        const now = new Date();
        const recentlyPlayed: SpotifyRecentlyPlayedEntity = {
          id: "test-id-123",
          trackId: "track-1",
          trackName: "Test Track",
          artist: "Test Artist",
          album: "Test Album",
          durationMs: 180000,
          explicit: false,
          popularity: 75,
          playedAt: new Date(now.getTime() - 60000),
          context: {
            type: "playlist",
            uri: "spotify:playlist:test",
          },
          albumData: null,
          createdAt: now,
          updatedAt: now,
          __type: "recently_played",
        };

        await recentlyPlayedRepository.saveRecentlyPlayed(recentlyPlayed);

        const retrieved = await recentlyPlayedRepository.getRecentlyPlayedById("test-id-123");
        assert(retrieved !== null, "Should retrieve the saved item");
        assert.equal(retrieved.id, "test-id-123");
        assert.equal(retrieved.trackName, "Test Track");
        assert.equal(retrieved.artist, "Test Artist");
      });

      it("should return null for non-existent ID", async () => {
        const retrieved = await recentlyPlayedRepository.getRecentlyPlayedById("non-existent-id");
        assert.equal(retrieved, null, "Should return null for non-existent ID");
      });
    });
  });
});
