import type { SpotifyArtist, SpotifyEntity, SpotifyTrack } from "../../entities/spotify/connector.spotify.entities";
import type { SpotifyTrackDataTarget } from "../../../infrastructure/db/schemas/connector.spotify.schema";
import { ConnectorMapper } from "../connector.mapper";
import type { ConnectorMapperDefinition } from "../connector.mapper.interface";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";

const spotifyTrackMapping: ConnectorMapperDefinition<SpotifyTrack, SpotifyEntity, SpotifyTrackDataTarget> = {
  id: connectorMapperPassThrough<"id", string>("id"),
  name: connectorMapperPassThrough<"name", string>("name"),
  popularity: connectorMapperPassThrough<"popularity", number>("popularity"),
  createdAt: connectorMapperPassThrough<"createdAt", Date>("createdAt"),
  updatedAt: connectorMapperPassThrough<"updatedAt", Date>("updatedAt"),

  artist: {
    external: (external) => external.artists.map((artist: SpotifyArtist) => artist.name).join(", "),
    domain: (domain) => domain.artist,
    dataTarget: (dataTarget) => dataTarget.artist,
  },

  album: {
    external: (external) => external.album.name,
    domain: (domain) => domain.album,
    dataTarget: (dataTarget) => dataTarget.album,
  },

  durationMs: {
    external: (external) => external.duration_ms,
    domain: (domain) => domain.durationMs,
    dataTarget: (dataTarget) => dataTarget.durationMs,
  },
};

const domainDefaults = { type: "track" as const };

export const connectorSpotifyTrackMapper = new ConnectorMapper<SpotifyTrack, SpotifyEntity, SpotifyTrackDataTarget>(
  spotifyTrackMapping,
  domainDefaults,
);
