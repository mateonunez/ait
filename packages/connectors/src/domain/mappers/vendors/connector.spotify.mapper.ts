import type {
  SpotifyArtistExternal,
  SpotifyArtistEntity,
  SpotifyTrackExternal,
  SpotifyTrackEntity,
  SpotifyPlaylistExternal,
  SpotifyPlaylistEntity,
  SpotifyAlbumExternal,
  SpotifyAlbumEntity,
} from "@/types/domain/entities/vendors/connector.spotify.types";
import type {
  SpotifyArtistDataTarget,
  SpotifyTrackDataTarget,
  SpotifyPlaylistDataTarget,
  SpotifyAlbumDataTarget,
} from "@ait/postgres";
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

const spotifyPlaylistMapping: ConnectorMapperDefinition<
  SpotifyPlaylistExternal,
  SpotifyPlaylistEntity,
  SpotifyPlaylistDataTarget
> = {
  id: connectorMapperPassThrough<
    "id",
    string,
    SpotifyPlaylistExternal,
    SpotifyPlaylistEntity,
    SpotifyPlaylistDataTarget
  >("id"),
  name: connectorMapperPassThrough<
    "name",
    string,
    SpotifyPlaylistExternal,
    SpotifyPlaylistEntity,
    SpotifyPlaylistDataTarget
  >("name"),
  description: {
    external: (external) => external.description ?? null,
    domain: (domain) => domain.description,
    dataTarget: (dataTarget) => dataTarget.description!,
  },
  public: {
    external: (external) => external.public ?? false,
    domain: (domain) => domain.public,
    dataTarget: (dataTarget) => dataTarget.public!,
  },
  collaborative: {
    external: (external) => external.collaborative ?? false,
    domain: (domain) => domain.collaborative,
    dataTarget: (dataTarget) => dataTarget.collaborative!,
  },
  owner: {
    external: (external) => external.owner?.display_name ?? "",
    domain: (domain) => domain.owner,
    dataTarget: (dataTarget) => dataTarget.owner,
  },
  tracks: {
    external: (external) => external.tracks?.total ?? 0,
    domain: (domain) => domain.tracks,
    dataTarget: (dataTarget) => dataTarget.tracks!,
  },
  followers: {
    external: (external) => external.followers?.total ?? 0,
    domain: (domain) => domain.followers,
    dataTarget: (dataTarget) => dataTarget.followers!,
  },
  snapshotId: {
    external: (external) => external.snapshot_id ?? "",
    domain: (domain) => domain.snapshotId,
    dataTarget: (dataTarget) => dataTarget.snapshotId,
  },
  uri: {
    external: (external) => external.uri ?? "",
    domain: (domain) => domain.uri,
    dataTarget: (dataTarget) => dataTarget.uri,
  },
  href: {
    external: (external) => external.href ?? "",
    domain: (domain) => domain.href,
    dataTarget: (dataTarget) => dataTarget.href,
  },

  createdAt: connectorMapperPassThrough<
    "createdAt",
    Date | null,
    SpotifyPlaylistExternal,
    SpotifyPlaylistEntity,
    SpotifyPlaylistDataTarget
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
    SpotifyPlaylistExternal,
    SpotifyPlaylistEntity,
    SpotifyPlaylistDataTarget
  >("updatedAt", {
    external: {
      fallback: () => new Date(),
    },
    dataTarget: {
      fallback: () => new Date(),
    },
  }),
  __type: {
    external: () => "playlist" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "playlist" as const,
  },
};

const spotifyPlaylistDomainDefaults = { __type: "playlist" as const };

export const connectorSpotifyPlaylistMapper = new ConnectorMapper<
  SpotifyPlaylistExternal,
  SpotifyPlaylistEntity,
  SpotifyPlaylistDataTarget
>(spotifyPlaylistMapping, spotifyPlaylistDomainDefaults);

const spotifyAlbumMapping: ConnectorMapperDefinition<SpotifyAlbumExternal, SpotifyAlbumEntity, SpotifyAlbumDataTarget> =
  {
    id: connectorMapperPassThrough<"id", string, SpotifyAlbumExternal, SpotifyAlbumEntity, SpotifyAlbumDataTarget>(
      "id",
    ),
    name: connectorMapperPassThrough<"name", string, SpotifyAlbumExternal, SpotifyAlbumEntity, SpotifyAlbumDataTarget>(
      "name",
    ),

    albumType: connectorMapperPassThrough<
      "albumType",
      string,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("albumType", {
      external: {
        fallback: () => "album",
      },
      dataTarget: {
        fallback: () => "album",
      },
    }),

    artists: {
      external: (external) => external.artists?.map((artist) => JSON.stringify(artist)) ?? [],
      domain: (domain) => domain.artists,
      dataTarget: (dataTarget) => dataTarget.artists ?? [],
    },

    tracks: {
      external: (external) => external.tracks?.items?.map((track) => JSON.stringify(track)) ?? [],
      domain: (domain) => domain.tracks,
      dataTarget: (dataTarget) => dataTarget.tracks ?? [],
    },

    totalTracks: connectorMapperPassThrough<
      "totalTracks",
      number,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("totalTracks", {
      external: {
        fallback: () => 0,
      },
      dataTarget: {
        fallback: () => 0,
      },
    }),

    releaseDate: connectorMapperPassThrough<
      "releaseDate",
      string | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("releaseDate", {
      external: {
        fallback: () => null,
      },
      dataTarget: {
        fallback: () => null,
      },
    }),

    releaseDatePrecision: connectorMapperPassThrough<
      "releaseDatePrecision",
      string | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("releaseDatePrecision", {
      external: {
        fallback: () => null,
      },
      dataTarget: {
        fallback: () => null,
      },
    }),

    isPlayable: connectorMapperPassThrough<
      "isPlayable",
      boolean,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("isPlayable", {
      external: {
        fallback: () => false,
      },
      dataTarget: {
        fallback: () => false,
      },
    }),

    uri: connectorMapperPassThrough<
      "uri",
      string | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("uri", {
      external: {
        fallback: () => null,
      },
      dataTarget: {
        fallback: () => null,
      },
    }),

    href: connectorMapperPassThrough<
      "href",
      string | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("href", {
      external: {
        fallback: () => null,
      },
      dataTarget: {
        fallback: () => null,
      },
    }),

    popularity: connectorMapperPassThrough<
      "popularity",
      number | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("popularity", {
      external: {
        fallback: () => null,
      },
      dataTarget: {
        fallback: () => null,
      },
    }),

    label: connectorMapperPassThrough<
      "label",
      string | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("label", {
      external: {
        fallback: () => null,
      },
      dataTarget: {
        fallback: () => null,
      },
    }),

    copyrights: {
      external: (external) => external.copyrights?.map((copyright) => JSON.stringify(copyright)) ?? [],
      domain: (domain) => domain.copyrights,
      dataTarget: (dataTarget) => dataTarget.copyrights ?? [],
    },

    externalIds: {
      external: (external) => Object.values(external.external_ids ?? {}),
      domain: (domain) => domain.externalIds,
      dataTarget: (dataTarget) => Object.values(dataTarget.externalIds ?? {}),
    },

    genres: {
      external: (external) => external.genres ?? [],
      domain: (domain) => domain.genres,
      dataTarget: (dataTarget) => dataTarget.genres ?? [],
    },

    createdAt: connectorMapperPassThrough<
      "createdAt",
      Date | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("createdAt", {
      external: {
        fallback: () => new Date(),
      },
    }),

    updatedAt: connectorMapperPassThrough<
      "updatedAt",
      Date | null,
      SpotifyAlbumExternal,
      SpotifyAlbumEntity,
      SpotifyAlbumDataTarget
    >("updatedAt", {
      external: {
        fallback: () => new Date(),
      },
    }),

    __type: {
      external: () => "album" as const,
      domain: (domain) => domain.__type,
      dataTarget: () => "album" as const,
    },
  };

const spotifyAlbumDomainDefaults = { __type: "album" as const };

export const connectorSpotifyAlbumMapper = new ConnectorMapper<
  SpotifyAlbumExternal,
  SpotifyAlbumEntity,
  SpotifyAlbumDataTarget
>(spotifyAlbumMapping, spotifyAlbumDomainDefaults);
