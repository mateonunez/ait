import { ConnectorDataNormalizer } from "../../../shared/data/normalizer/connector.normalizer";
import type { ConnectorDataNormalizerMapping } from "../../../shared/data/normalizer/connector.normalizer.interface";
import type { NormalizedSpotifyTrack, SpotifyTrack } from "./connector.spotify.normalizer.interface";

const mapping: ConnectorDataNormalizerMapping<SpotifyTrack, NormalizedSpotifyTrack> = {
  id: "id",
  name: "name",
  artists: (data) => data.artists.map((artist) => artist.name).join(", "),
  album: (data) => data.album.name,
  popularity: "popularity",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  duration: (data) => `${Math.floor(data.duration_ms / 60000)}m ${Math.floor((data.duration_ms % 60000) / 1000)}s`,
};

export class ConnectorSpotifyNormalizer extends ConnectorDataNormalizer<SpotifyTrack, NormalizedSpotifyTrack> {
  constructor() {
    super(mapping);
  }
}
