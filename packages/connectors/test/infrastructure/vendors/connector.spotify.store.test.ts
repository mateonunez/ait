import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { SpotifyTrackEntity } from "../../../src/domain/entities/spotify/spotify-track.entity";
import { ConnectorSpotifyStore } from "../../../src/infrastructure/vendors/spotify/connector.spotify.store";
import type { IConnectorSpotifyRepository } from "../../../src/types/domain/entities/vendors/connector.spotify.types";

describe("ConnectorSpotifyStore", () => {
  let mockRepository: IConnectorSpotifyRepository;
  let store: ConnectorSpotifyStore;

  beforeEach(() => {
    mockRepository = {
      track: {
        saveTrack: async (_track: SpotifyTrackEntity) => {},
      },
    } as unknown as IConnectorSpotifyRepository;

    store = new ConnectorSpotifyStore(mockRepository);
  });

  describe("save", () => {
    it("should call saveTrack for a single track item", async () => {
      let saveTrackCalledWith: SpotifyTrackEntity;

      mockRepository.track.saveTrack = async (track: SpotifyTrackEntity) => {
        saveTrackCalledWith = track;
      };

      const track: SpotifyTrackEntity = {
        id: "track-1",
        name: "Track One",
        __type: "spotify_track",
        artist: "An Artist",
        album: "An Album",
        durationMs: 180000,
        popularity: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as SpotifyTrackEntity;

      await store.save(track);

      // @ts-expect-error - It's intercepted by the mock
      assert.ok(saveTrackCalledWith, "Expected saveTrack to be called");
      assert.equal(saveTrackCalledWith, track);
    });

    it("should call saveTrack for multiple track items", async () => {
      const spotifyTracks: SpotifyTrackEntity[] = [];
      mockRepository.track.saveTrack = async (track: SpotifyTrackEntity) => {
        spotifyTracks.push(track);
      };

      const tracks: SpotifyTrackEntity[] = [
        {
          id: "track-1",
          name: "Track One",
          __type: "spotify_track",
          artist: "Artist One",
          album: "Album One",
          durationMs: 180000,
          popularity: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "track-2",
          name: "Track Two",
          __type: "spotify_track",
          artist: "Artist Two",
          album: "Album Two",
          durationMs: 240000,
          popularity: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as unknown as SpotifyTrackEntity[];

      await store.save(tracks);

      assert.equal(spotifyTracks.length, 2, "Expected saveTrack to be called twice");
      assert.equal(spotifyTracks[0], tracks[0]);
      assert.equal(spotifyTracks[1], tracks[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedItem = {
        id: "unsupported-1",
        name: "Some Entity",
        __type: "unsupported",
      } as unknown as SpotifyTrackEntity;

      await assert.rejects(() => store.save(unsupportedItem), {
        message: "Type unsupported is not supported",
      });
    });
  });
});
