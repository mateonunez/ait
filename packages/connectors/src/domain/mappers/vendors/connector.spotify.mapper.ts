import type {
  SpotifyArtistExternal,
  SpotifyArtistEntity,
  SpotifyTrackExternal,
  SpotifyTrackEntity,
  SpotifyPlaylistExternal,
  SpotifyPlaylistEntity,
  SpotifyAlbumExternal,
  SpotifyAlbumEntity,
  SpotifyRecentlyPlayedEntity,
  SpotifyRecentlyPlayedExternal,
} from "../../../types/domain/entities/vendors/connector.spotify.types";
import type {
  SpotifyArtistDataTarget,
  SpotifyTrackDataTarget,
  SpotifyPlaylistDataTarget,
  SpotifyAlbumDataTarget,
  SpotifyRecentlyPlayedDataTarget,
} from "@ait/postgres";
import { ConnectorMapper } from "../connector.mapper";
import { connectorMapperPassThrough, mapObjectToStringArray } from "../utils/connector.mapper.utils";
import type { ConnectorMapperDefinition } from "../../../types/domain/mappers/connector.mapper.interface";

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

    albumData: {
      external: (external) => (external.album ? (external.album as Record<string, unknown>) : null),
      domain: (domain) => domain.albumData,
      dataTarget: (dataTarget) => (dataTarget.albumData as Record<string, unknown>) ?? null,
    },

    artistsData: {
      external: (external) => (external.artists ? (external.artists as Array<Record<string, unknown>>) : []),
      domain: (domain) => domain.artistsData,
      dataTarget: (dataTarget) => (dataTarget.artistsData as Array<Record<string, unknown>>) ?? [],
    },

    externalIds: {
      external: (external) => (external.external_ids ? (external.external_ids as Record<string, unknown>) : null),
      domain: (domain) => domain.externalIds,
      dataTarget: (dataTarget) => (dataTarget.externalIds as Record<string, unknown>) ?? null,
    },

    externalUrls: {
      external: (external) => (external.external_urls ? (external.external_urls as Record<string, unknown>) : null),
      domain: (domain) => domain.externalUrls,
      dataTarget: (dataTarget) => (dataTarget.externalUrls as Record<string, unknown>) ?? null,
    },

    addedAt: {
      external: (external) => {
        const addedAtStr = (external as any).addedAt;
        return addedAtStr ? new Date(addedAtStr) : null;
      },
      domain: (domain) => domain.addedAt,
      dataTarget: (dataTarget) => dataTarget.addedAt ?? null,
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
  genres: {
    external: (external: SpotifyArtistExternal) => mapObjectToStringArray(external.genres),
    domain: (domain: SpotifyArtistEntity) => domain.genres,
    dataTarget: (dataTarget: SpotifyArtistDataTarget) => dataTarget.genres ?? [],
  },
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
    external: (external: SpotifyPlaylistExternal) => {
      const tracksData = external.tracks;
      if (!tracksData) return [];

      const result: string[] = [];

      if (tracksData.href) {
        result.push(`href: ${tracksData.href}`);
      }
      if (typeof tracksData.total === "number") {
        result.push(`total: ${tracksData.total}`);
      }

      if (tracksData.items && Array.isArray(tracksData.items)) {
        const trackNames = tracksData.items
          .filter((item) => item?.track)
          .map((item) => {
            const track = item.track;
            const name = track?.name || "Unknown";
            const artist = track && "artists" in track && track.artists?.[0]?.name ? track.artists[0].name : "Unknown";
            return `track: ${artist} - ${name}`;
          });
        result.push(...trackNames);
      }

      return result;
    },
    domain: (domain: SpotifyPlaylistEntity) => domain.tracks,
    dataTarget: (dataTarget: SpotifyPlaylistDataTarget) => dataTarget.tracks ?? [],
  },
  followers: {
    external: (_external) => 0,
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

  externalUrls: {
    external: (external) => mapObjectToStringArray(external.external_urls),
    domain: (domain) => domain.externalUrls,
    dataTarget: (dataTarget) => dataTarget.externalUrls ?? [],
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
      external: (external: SpotifyAlbumExternal) =>
        mapObjectToStringArray(external.artists, {
          valueTransform: (value) => JSON.stringify(value),
          maxDepth: 6,
        }),
      domain: (domain: SpotifyAlbumEntity) => domain.artists,
      dataTarget: (dataTarget: SpotifyAlbumDataTarget) => dataTarget.artists ?? [],
    },

    tracks: {
      external: (external) =>
        mapObjectToStringArray(external.tracks, {
          valueTransform: (value) => JSON.stringify(value),
          maxDepth: 6,
          excludeKeys: ["available_markets"],
        }),
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
      external: (external: SpotifyAlbumExternal) => mapObjectToStringArray(external.copyrights),
      domain: (domain: SpotifyAlbumEntity) => domain.copyrights,
      dataTarget: (dataTarget: SpotifyAlbumDataTarget) => dataTarget.copyrights ?? [],
    },

    externalIds: {
      external: (external: SpotifyAlbumExternal) => mapObjectToStringArray(external.external_ids),
      domain: (domain: SpotifyAlbumEntity) => domain.externalIds,
      dataTarget: (dataTarget: SpotifyAlbumDataTarget) => dataTarget.externalIds ?? [],
    },

    genres: {
      external: (external) => mapObjectToStringArray(external.genres, (genre) => JSON.stringify(genre)),
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

const spotifyRecentlyPlayedMapping: ConnectorMapperDefinition<
  SpotifyRecentlyPlayedExternal,
  SpotifyRecentlyPlayedEntity,
  SpotifyRecentlyPlayedDataTarget
> = {
  id: {
    external: (external: SpotifyRecentlyPlayedExternal) => {
      const trackId = external.track?.id ?? "";
      const playedAt = external.played_at ?? "";
      return `${trackId}-${playedAt}`;
    },
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.id,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.id,
  },

  trackId: {
    external: (external: SpotifyRecentlyPlayedExternal) => external.track?.id ?? "",
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.trackId,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.trackId,
  },

  trackName: {
    external: (external: SpotifyRecentlyPlayedExternal) => external.track?.name ?? "",
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.trackName,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.trackName,
  },

  artist: {
    external: (external: SpotifyRecentlyPlayedExternal) =>
      external.track?.artists?.map((artist) => artist.name).join(", ") ?? "",
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.artist,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.artist,
  },

  album: {
    external: (external: SpotifyRecentlyPlayedExternal) => external.track?.album?.name ?? null,
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.album,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.album!,
  },

  durationMs: {
    external: (external: SpotifyRecentlyPlayedExternal) => external.track?.duration_ms ?? 0,
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.durationMs,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.durationMs,
  },

  explicit: {
    external: (external: SpotifyRecentlyPlayedExternal) => external.track?.explicit ?? false,
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.explicit,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.explicit!,
  },

  popularity: {
    external: (external: SpotifyRecentlyPlayedExternal) => external.track?.popularity ?? null,
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.popularity,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.popularity!,
  },

  playedAt: {
    external: (external: SpotifyRecentlyPlayedExternal) => new Date(external.played_at ?? ""),
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.playedAt,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) => dataTarget.playedAt,
  },

  context: {
    external: (external: SpotifyRecentlyPlayedExternal): { type: string; uri: string } | null => {
      if (!external.context) return null;
      return {
        type: external.context.type ?? "",
        uri: external.context.uri ?? "",
      };
    },
    domain: (domain: SpotifyRecentlyPlayedEntity) => domain.context,
    dataTarget: (dataTarget: SpotifyRecentlyPlayedDataTarget) =>
      dataTarget.context as { type: string; uri: string } | null,
  },

  createdAt: connectorMapperPassThrough<
    "createdAt",
    Date | null,
    SpotifyRecentlyPlayedExternal,
    SpotifyRecentlyPlayedEntity,
    SpotifyRecentlyPlayedDataTarget
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
    SpotifyRecentlyPlayedExternal,
    SpotifyRecentlyPlayedEntity,
    SpotifyRecentlyPlayedDataTarget
  >("updatedAt", {
    external: {
      fallback: () => new Date(),
    },
    dataTarget: {
      fallback: () => new Date(),
    },
  }),

  __type: {
    external: () => "recently_played" as const,
    domain: (domain) => domain.__type,
    dataTarget: () => "recently_played" as const,
  },
};

const spotifyRecentlyPlayedDomainDefaults = { __type: "recently_played" as const };

export const connectorSpotifyRecentlyPlayedMapper = new ConnectorMapper<
  SpotifyRecentlyPlayedExternal,
  SpotifyRecentlyPlayedEntity,
  SpotifyRecentlyPlayedDataTarget
>(spotifyRecentlyPlayedMapping, spotifyRecentlyPlayedDomainDefaults);
