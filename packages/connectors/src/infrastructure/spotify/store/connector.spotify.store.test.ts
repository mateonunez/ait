import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ConnectorSpotifyStore } from "./connector.spotify.store";
import type { IConnectorSpotifyRepository } from "../../../domain/entities/spotify/connector.spotify.repository.interface";
import type { SpotifyTrackEntity, SpotifyEntity } from "../../../domain/entities/spotify/connector.spotify.entities";

describe("ConnectorSpotifyStore", () => {
  let mockRepository: IConnectorSpotifyRepository;
  let store: ConnectorSpotifyStore;

  beforeEach(() => {
    mockRepository = {
      saveTrack: async (_track: SpotifyTrackEntity) => {},
    } as unknown as IConnectorSpotifyRepository;

    store = new ConnectorSpotifyStore(mockRepository);
  });

  describe("save", () => {
    it("should call saveTrack for a single track item", async () => {
      let saveTrackCalledWith: SpotifyTrackEntity;

      mockRepository.saveTrack = async (track: SpotifyTrackEntity) => {
        saveTrackCalledWith = track;
      };

      const track: SpotifyTrackEntity = {
        id: "track-1",
        name: "Track One",
        type: "track",
        artist: "An Artist",
        album: "An Album",
        durationMs: 180000,
        popularity: 42,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await store.save(track);

      // @ts-expect-error - It's intercepted by the mock
      assert.ok(saveTrackCalledWith, "Expected saveTrack to be called");
      assert.equal(saveTrackCalledWith, track);
    });

    it("should call saveTrack for multiple track items", async () => {
      const spotifyTracks: SpotifyTrackEntity[] = [];
      mockRepository.saveTrack = async (track: SpotifyTrackEntity) => {
        spotifyTracks.push(track);
      };

      const tracks: SpotifyTrackEntity[] = [
        {
          id: "track-1",
          name: "Track One",
          type: "track",
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
          type: "track",
          artist: "Artist Two",
          album: "Album Two",
          durationMs: 240000,
          popularity: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await store.save(tracks);

      assert.equal(spotifyTracks.length, 2, "Expected saveTrack to be called twice");
      assert.equal(spotifyTracks[0], tracks[0]);
      assert.equal(spotifyTracks[1], tracks[1]);
    });

    it("should throw an error if the item type is not supported", async () => {
      const unsupportedItem = {
        id: "unsupported-1",
        name: "Some Entity",
        type: "unsupported" as "track", // this generates a type error
      } as unknown as SpotifyEntity;

      await assert.rejects(async () => {
        await store.save(unsupportedItem);
      }, /Type unsupported is not supported/);
    });
  });
});
