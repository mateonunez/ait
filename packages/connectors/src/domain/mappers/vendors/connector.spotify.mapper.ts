import type {
  SpotifyArtistExternal,
  SpotifyArtistEntity,
  SpotifyTrackExternal,
  SpotifyTrackEntity,
} from "@/types/domain/entities/vendors/connector.spotify.types";
import type { SpotifyArtistDataTarget, SpotifyTrackDataTarget } from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough } from "../utils/connector.mapper.utils";
import type { ConnectorMapperDefinition } from "@/types/domain/mappers/connector.mapper.interface";

const spotifyTrackMapping: ConnectorMapperDefinition<SpotifyTrackExternal, SpotifyTrackEntity, SpotifyTrackDataTarget> =
  {
    id: connectorMapperPassThrough<"id", string, SpotifyTrackExternal, SpotifyTrackEntity, SpotifyTrackDataTarget>(
      "id",
    ),
    name: connectorMapperPassThrough<"name", string, SpotifyTrackExternal, SpotifyTrackEntity, SpotifyTrackDataTarget>(
      "name",
    ),
    popularity: connectorMapperPassThrough<
      "popularity",
      number | null,
      SpotifyTrackExternal,
      SpotifyTrackEntity,
      SpotifyTrackDataTarget
    >("popularity"),

    explicit: {
      external: (external) => external.explicit ?? false,
      domain: (domain) => domain.explicit,
      dataTarget: (dataTarget) => dataTarget.explicit!,
    },

    isPlayable: {
      external: (external) => external.is_playable ?? null,
      domain: (domain) => domain.isPlayable,
      dataTarget: (dataTarget) => dataTarget.isPlayable!,
    },

    previewUrl: {
      external: (external) => external.preview_url ?? null,
      domain: (domain) => domain.previewUrl,
      dataTarget: (dataTarget) => dataTarget.previewUrl!,
    },

    trackNumber: {
      external: (external) => external.track_number ?? null,
      domain: (domain) => domain.trackNumber,
      dataTarget: (dataTarget) => dataTarget.trackNumber!,
    },

    discNumber: {
      external: (external) => external.disc_number ?? null,
      domain: (domain) => domain.discNumber,
      dataTarget: (dataTarget) => dataTarget.discNumber!,
    },

    uri: {
      external: (external) => external.uri ?? null,
      domain: (domain) => domain.uri,
      dataTarget: (dataTarget) => dataTarget.uri!,
    },

    href: {
      external: (external) => external.href ?? null,
      domain: (domain) => domain.href,
      dataTarget: (dataTarget) => dataTarget.href!,
    },

    isLocal: {
      external: (external) => external.is_local ?? false,
      domain: (domain) => domain.isLocal,
      dataTarget: (dataTarget) => dataTarget.isLocal!,
    },

    artist: {
      external: (external) => external.artists?.map((artist) => artist.name).join(", ") ?? "",
      domain: (domain) => domain.artist,
      dataTarget: (dataTarget) => dataTarget.artist,
    },

    album: {
      external: (external) => external.album?.name ?? null, // Changed to null to match entity type
      domain: (domain) => domain.album,
      dataTarget: (dataTarget) => dataTarget.album!,
    },

    durationMs: {
      external: (external) => external.duration_ms ?? 0,
      domain: (domain) => domain.durationMs,
      dataTarget: (dataTarget) => dataTarget.durationMs,
    },

    __type: {
      external: () => "track" as const,
      domain: (domain) => domain.__type,
      dataTarget: () => "track" as const,
    },
  };
const spotifyTrackDomainDefaults = { __type: "track" as const };

export const connectorSpotifyTrackMapper = new ConnectorMapper<
  SpotifyTrackExternal,
  SpotifyTrackEntity,
  SpotifyTrackDataTarget
>(spotifyTrackMapping, spotifyTrackDomainDefaults);

const spotifyArtistMapping: ConnectorMapperDefinition<
  SpotifyArtistExternal,
  SpotifyArtistEntity,
  SpotifyArtistDataTarget
> = {
  id: connectorMapperPassThrough<"id", string, SpotifyArtistExternal, SpotifyArtistEntity, SpotifyArtistDataTarget>(
    "id",
  ),

  name: connectorMapperPassThrough<"name", string, SpotifyArtistExternal, SpotifyArtistEntity, SpotifyArtistDataTarget>(
    "name",
  ),

  popularity: connectorMapperPassThrough<
    "popularity",
    number | null,
    SpotifyArtistExternal,
    SpotifyArtistEntity,
    SpotifyArtistDataTarget
  >("popularity"),

  genres: connectorMapperPassThrough<
    "genres",
    string[] | null,
    SpotifyArtistExternal,
    SpotifyArtistEntity,
    SpotifyArtistDataTarget
  >("genres"),

  createdAt: connectorMapperPassThrough<
    "createdAt",
    Date | null,
    SpotifyArtistExternal,
    SpotifyArtistEntity,
    SpotifyArtistDataTarget
  >("createdAt", {
    external: {
      fallback: () => new Date(),
    },
    dataTarget: {
      fallback: () => new Date(),
    },
  }),

  updatedAt: connectorMapperPassThrough<
    "updatedAt",
    Date | null,
    SpotifyArtistExternal,
    SpotifyArtistEntity,
    SpotifyArtistDataTarget
  >("updatedAt", {
    external: {
      fallback: () => new Date(),
    },
    dataTarget: {
      fallback: () => new Date(),
    },
  }),

  __type: {
    external: () => "artist" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "artist" as const,
  },
};

const spotifyArtistDomainDefaults = { __type: "artist" as const };

export const connectorSpotifyArtistMapper = new ConnectorMapper<
  SpotifyArtistExternal,
  SpotifyArtistEntity,
  SpotifyArtistDataTarget
>(spotifyArtistMapping, spotifyArtistDomainDefaults);
