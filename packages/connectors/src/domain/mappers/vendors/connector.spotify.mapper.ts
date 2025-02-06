import type {
  SpotifyArtist,
  SpotifyArtistEntity,
  SpotifyTrack,
  SpotifyTrackEntity,
} from "@/types/domain/entities/vendors/connector.spotify.repository.types";
import type { SpotifyTrackDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import type { ConnectorMapperDefinition } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";

const spotifyTrackMapping: ConnectorMapperDefinition<SpotifyTrack, SpotifyTrackEntity, SpotifyTrackDataTarget> = {
  id: connectorMapperPassThrough<"id", string>("id"),
  name: connectorMapperPassThrough<"name", string>("name"),
  popularity: connectorMapperPassThrough<"popularity", number>("popularity"),

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

const spotifyTrackDomainDefaults = { type: "track" as const };

export const connectorSpotifyTrackMapper = new ConnectorMapper<
  SpotifyTrack,
  SpotifyTrackEntity,
  SpotifyTrackDataTarget
>(spotifyTrackMapping, spotifyTrackDomainDefaults);

const spotifyArtistMapping: ConnectorMapperDefinition<SpotifyArtist, SpotifyArtistEntity, SpotifyTrackDataTarget> = {
  id: connectorMapperPassThrough<"id", string>("id"),
  name: connectorMapperPassThrough<"name", string>("name"),
  popularity: connectorMapperPassThrough<"popularity", number>("popularity"),
  genres: connectorMapperPassThrough<"genres", string[]>("genres"),
};

const spotifyArtistDomainDefaults = { type: "artist" as const };

export const connectorSpotifyArtistMapper = new ConnectorMapper<
  SpotifyArtist,
  SpotifyArtistEntity,
  SpotifyTrackDataTarget
>(spotifyArtistMapping, spotifyArtistDomainDefaults);
