import { ConnectorDataNormalizer } from "../../../shared/data/normalizer/connector.normalizer";
import type { ConnectorDataNormalizerMapping } from "../../../shared/data/normalizer/connector.normalizer.interface";
import type { NormalizedSpotifyTrack, SpotifyTrack } from "./connector.spotify.normalizer.interface";

const mapping: ConnectorDataNormalizerMapping<SpotifyTrack, NormalizedSpotifyTrack> = {
  id: 'id',
  name: 'name',
  artists: 'artists',
  album: 'album',
  duration: 'duration',
  popularity: 'popularity',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
};

export class ConnectorSpotifyNormalizer extends ConnectorDataNormalizer<SpotifyTrack, NormalizedSpotifyTrack> {
  constructor() {
    super(mapping);
  }
}
