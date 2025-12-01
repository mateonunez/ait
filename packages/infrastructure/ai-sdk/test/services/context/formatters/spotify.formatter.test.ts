import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  SpotifyAlbumEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyRecentlyPlayedEntity,
  SpotifyTrackEntity,
} from "@ait/core";
import {
  SpotifyAlbumFormatter,
  SpotifyArtistFormatter,
  SpotifyPlaylistFormatter,
  SpotifyRecentlyPlayedFormatter,
  SpotifyTrackFormatter,
} from "../../../../src/services/context/formatters/spotify.formatter";

describe("Spotify Formatters", () => {
  describe("SpotifyTrackFormatter", () => {
    it("should format track with full metadata", () => {
      const meta: SpotifyTrackEntity = {
        __type: "track",
        id: "track1",
        name: "Test Song",
        artist: "Test Artist",
        album: "Test Album",
        popularity: 85,
        explicit: true,
      } as SpotifyTrackEntity;

      const result = SpotifyTrackFormatter.format(meta);

      assert.ok(result.includes('Track: "Test Song"'));
      assert.ok(result.includes("Test Artist"));
      assert.ok(result.includes("Test Album"));
      assert.ok(result.includes("85/100"));
      assert.ok(result.includes("[Explicit]"));
    });

    it("should handle missing optional fields", () => {
      const meta: SpotifyTrackEntity = {
        __type: "track",
        id: "track1",
        name: "Test Song",
        artist: "Test Artist",
      } as SpotifyTrackEntity;

      const result = SpotifyTrackFormatter.format(meta);

      assert.ok(result.includes('Track: "Test Song"'));
      assert.ok(result.includes("Test Artist"));
      assert.ok(!result.includes("[Explicit]"));
      assert.ok(!result.includes("popularity"));
    });

    it("should not show album when album name equals track name", () => {
      const meta: SpotifyTrackEntity = {
        __type: "track",
        id: "track1",
        name: "Test Song",
        artist: "Test Artist",
        album: "Test Song", // Same as track name
      } as SpotifyTrackEntity;

      const result = SpotifyTrackFormatter.format(meta);

      assert.ok(result.includes('Track: "Test Song"'));
      assert.ok(!result.includes('from the album "Test Song"'));
    });

    it("should use default values for missing name and artist", () => {
      const meta: SpotifyTrackEntity = {
        __type: "track",
        id: "track1",
      } as SpotifyTrackEntity;

      const result = SpotifyTrackFormatter.format(meta);

      assert.ok(result.includes("Unknown Track"));
      assert.ok(result.includes("Unknown Artist"));
    });

    it("should handle pageContent parameter", () => {
      const meta: SpotifyTrackEntity = {
        __type: "track",
        id: "track1",
        name: "Test Song",
        artist: "Test Artist",
      } as SpotifyTrackEntity;

      const result = SpotifyTrackFormatter.format(meta, "Some page content");

      assert.ok(result.includes('Track: "Test Song"'));
      assert.ok(result.includes("Test Artist"));
    });
  });

  describe("SpotifyPlaylistFormatter", () => {
    it("should format playlist with full metadata", () => {
      const meta: SpotifyPlaylistEntity = {
        __type: "playlist",
        id: "playlist1",
        name: "My Playlist",
        description: "A great playlist",
        tracks: [{ id: "track1" }, { id: "track2" }, { id: "track3" }],
      } as unknown as SpotifyPlaylistEntity;

      const result = SpotifyPlaylistFormatter.format(meta);

      assert.ok(result.includes('Playlist: "My Playlist"'));
      assert.ok(result.includes("A great playlist"));
      assert.ok(result.includes("(3 tracks)"));
    });

    it("should format playlist without description", () => {
      const meta: SpotifyPlaylistEntity = {
        __type: "playlist",
        id: "playlist1",
        name: "My Playlist",
        tracks: [{ id: "track1" }],
      } as unknown as SpotifyPlaylistEntity;

      const result = SpotifyPlaylistFormatter.format(meta);

      assert.ok(result.includes('Playlist: "My Playlist"'));
      assert.ok(!result.includes("-"));
      assert.ok(result.includes("(1 tracks)"));
    });

    it("should format playlist without tracks", () => {
      const meta: SpotifyPlaylistEntity = {
        __type: "playlist",
        id: "playlist1",
        name: "My Playlist",
        description: "Empty playlist",
        tracks: [],
      } as unknown as SpotifyPlaylistEntity;

      const result = SpotifyPlaylistFormatter.format(meta);

      assert.ok(result.includes('Playlist: "My Playlist"'));
      assert.ok(result.includes("Empty playlist"));
      assert.ok(!result.includes("(0 tracks)"));
    });

    it("should use default name for missing name", () => {
      const meta: SpotifyPlaylistEntity = {
        __type: "playlist",
        id: "playlist1",
      } as SpotifyPlaylistEntity;

      const result = SpotifyPlaylistFormatter.format(meta);

      assert.ok(result.includes("Unnamed Playlist"));
    });
  });

  describe("SpotifyAlbumFormatter", () => {
    it("should format album with string artists", () => {
      const meta: SpotifyAlbumEntity = {
        __type: "album",
        id: "album1",
        name: "Test Album",
        artists: ["Artist One", "Artist Two"],
        releaseDate: "2023-01-15",
        totalTracks: 12,
      } as SpotifyAlbumEntity;

      const result = SpotifyAlbumFormatter.format(meta);

      assert.ok(result.includes('Album: "Test Album"'));
      assert.ok(result.includes("Artist One"));
      assert.ok(result.includes("(2023-01-15)"));
      assert.ok(result.includes("12 tracks"));
    });

    it("should format album with artist objects", () => {
      const meta: SpotifyAlbumEntity = {
        __type: "album",
        id: "album1",
        name: "Test Album",
        artists: [{ name: "Artist Name" }, { name: "Another Artist" }],
        releaseDate: "2023-01-15",
        totalTracks: 10,
      } as unknown as SpotifyAlbumEntity;

      const result = SpotifyAlbumFormatter.format(meta);

      assert.ok(result.includes('Album: "Test Album"'));
      assert.ok(result.includes("Artist Name"));
    });

    it("should format album without optional fields", () => {
      const meta: SpotifyAlbumEntity = {
        __type: "album",
        id: "album1",
        name: "Test Album",
        artists: ["Test Artist"],
      } as SpotifyAlbumEntity;

      const result = SpotifyAlbumFormatter.format(meta);

      assert.ok(result.includes('Album: "Test Album"'));
      assert.ok(result.includes("Test Artist"));
      assert.ok(!result.includes("("));
    });

    it("should handle empty artists array", () => {
      const meta: SpotifyAlbumEntity = {
        __type: "album",
        id: "album1",
        name: "Test Album",
        artists: [],
      } as unknown as SpotifyAlbumEntity;

      const result = SpotifyAlbumFormatter.format(meta);

      assert.ok(result.includes('Album: "Test Album"'));
      assert.ok(result.includes("Unknown Artist"));
    });

    it("should use default name for missing name", () => {
      const meta: SpotifyAlbumEntity = {
        __type: "album",
        id: "album1",
        artists: ["Test Artist"],
      } as SpotifyAlbumEntity;

      const result = SpotifyAlbumFormatter.format(meta);

      assert.ok(result.includes("Unknown Album"));
    });
  });

  describe("SpotifyArtistFormatter", () => {
    it("should format artist with genres", () => {
      const meta: SpotifyArtistEntity = {
        __type: "artist",
        id: "artist1",
        name: "Test Artist",
        genres: ["indie", "pop", "rock", "folk"],
        popularity: 90,
      } as SpotifyArtistEntity;

      const result = SpotifyArtistFormatter.format(meta);

      assert.ok(result.includes("I follow Test Artist"));
      assert.ok(result.includes("indie, pop, rock"));
      assert.ok(!result.includes("folk")); // Should limit to 3 genres
      assert.ok(result.includes("90/100"));
    });

    it("should format artist without genres", () => {
      const meta: SpotifyArtistEntity = {
        __type: "artist",
        id: "artist1",
        name: "Test Artist",
        popularity: 85,
      } as SpotifyArtistEntity;

      const result = SpotifyArtistFormatter.format(meta);

      assert.ok(result.includes("I follow Test Artist"));
      assert.ok(result.includes("85/100"));
      assert.ok(!result.includes("exploring"));
    });

    it("should format artist without popularity", () => {
      const meta: SpotifyArtistEntity = {
        __type: "artist",
        id: "artist1",
        name: "Test Artist",
        genres: ["indie"],
      } as SpotifyArtistEntity;

      const result = SpotifyArtistFormatter.format(meta);

      assert.ok(result.includes("I follow Test Artist"));
      assert.ok(result.includes("indie"));
      assert.ok(!result.includes("popularity"));
    });

    it("should handle empty genres array", () => {
      const meta: SpotifyArtistEntity = {
        __type: "artist",
        id: "artist1",
        name: "Test Artist",
        genres: [],
        popularity: 80,
      } as unknown as SpotifyArtistEntity;

      const result = SpotifyArtistFormatter.format(meta);

      assert.ok(result.includes("I follow Test Artist"));
      assert.ok(!result.includes("exploring"));
    });

    it("should use default name for missing name", () => {
      const meta: SpotifyArtistEntity = {
        __type: "artist",
        id: "artist1",
      } as SpotifyArtistEntity;

      const result = SpotifyArtistFormatter.format(meta);

      assert.ok(result.includes("Unknown Artist"));
    });
  });

  describe("SpotifyRecentlyPlayedFormatter", () => {
    it("should format recently played track with full metadata", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
        trackName: "Cool Song",
        artist: "Cool Artist",
        album: "Cool Album",
        durationMs: 180000, // 3 minutes
        popularity: 75,
        explicit: false,
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(result.includes('I played "Cool Song"'));
      assert.ok(result.includes("Cool Artist"));
      assert.ok(result.includes("Cool Album"));
      assert.ok(result.includes("(3:00)"));
      assert.ok(result.includes("popular track"));
    });

    it("should handle explicit tracks", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
        trackName: "Explicit Song",
        artist: "Test Artist",
        explicit: true,
        popularity: 80,
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(result.includes("[Explicit]"));
    });

    it("should handle niche tracks", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
        trackName: "Obscure Song",
        artist: "Indie Artist",
        popularity: 25,
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(result.includes("niche track"));
    });

    it("should handle medium popularity tracks (no vibe tag)", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
        trackName: "Medium Song",
        artist: "Test Artist",
        popularity: 50, // Between 30 and 70
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(!result.includes("popular track"));
      assert.ok(!result.includes("niche track"));
    });

    it("should format duration correctly with seconds padding", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
        trackName: "Test Song",
        artist: "Test Artist",
        durationMs: 125000, // 2 minutes 5 seconds
        popularity: 75,
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(result.includes("(2:05)"));
    });

    it("should handle tracks without album", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
        trackName: "Test Song",
        artist: "Test Artist",
        durationMs: 180000,
        popularity: 75,
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(result.includes('I played "Test Song"'));
      assert.ok(!result.includes("from"));
    });

    it("should handle tracks without duration", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
        trackName: "Test Song",
        artist: "Test Artist",
        popularity: 75,
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(result.includes('I played "Test Song"'));
      assert.ok(!result.includes("("));
    });

    it("should use default values for missing name and artist", () => {
      const meta: SpotifyRecentlyPlayedEntity = {
        __type: "recently_played",
        id: "rp1",
      } as SpotifyRecentlyPlayedEntity;

      const result = SpotifyRecentlyPlayedFormatter.format(meta);

      assert.ok(result.includes("Unknown Track"));
      assert.ok(result.includes("Unknown Artist"));
    });
  });
});
