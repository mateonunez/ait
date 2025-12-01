import type {
  SpotifyAlbumEntity,
  SpotifyArtistEntity,
  SpotifyPlaylistEntity,
  SpotifyRecentlyPlayedEntity,
  SpotifyTrackEntity,
} from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import { joinParts, safeArray, safeNumber, safeString } from "./formatter.utils";

const extractArtistName = (artists: unknown[]): string => {
  if (artists.length === 0) return "Unknown Artist";
  const first = artists[0];
  if (typeof first === "string") return first;
  if (typeof first === "object" && first !== null && "name" in first && typeof first.name === "string") {
    return first.name;
  }
  return "Unknown Artist";
};

export const SpotifyTrackFormatter: EntityFormatter<SpotifyTrackEntity> = {
  format: (meta) => {
    const name = safeString(meta.name, "Unknown Track");
    const artist = safeString(meta.artist, "Unknown Artist");
    const album = meta.album && meta.album !== name ? meta.album : null;
    const popularity = safeNumber(meta.popularity);
    const explicit = meta.explicit ? " [Explicit]" : "";

    return joinParts(
      `Track: "${name}" by ${artist}`,
      album ? ` from the album "${album}"` : null,
      popularity !== null ? ` (popularity: ${popularity}/100)` : null,
      explicit,
    );
  },
};

export const SpotifyArtistFormatter: EntityFormatter<SpotifyArtistEntity> = {
  format: (meta) => {
    const name = safeString(meta.name, "Unknown Artist");
    const genres = safeArray<string>(meta.genres)
      .filter((g) => typeof g === "string")
      .slice(0, 3);
    const popularity = safeNumber(meta.popularity);

    return joinParts(
      `I follow ${name}`,
      genres.length > 0 ? `, exploring ${genres.join(", ")}` : null,
      popularity !== null ? ` (popularity: ${popularity}/100)` : null,
    );
  },
};

export const SpotifyPlaylistFormatter: EntityFormatter<SpotifyPlaylistEntity> = {
  format: (meta) => {
    const name = safeString(meta.name, "Unnamed Playlist");
    const description = safeString(meta.description);
    const trackCount = safeArray(meta.tracks).length;

    return joinParts(
      `Playlist: "${name}"`,
      description ? ` - ${description}` : null,
      trackCount > 0 ? ` (${trackCount} tracks)` : null,
    );
  },
};

export const SpotifyAlbumFormatter: EntityFormatter<SpotifyAlbumEntity> = {
  format: (meta) => {
    const name = safeString(meta.name, "Unknown Album");
    const artists = safeArray(meta.artists);
    const artistName = extractArtistName(artists);
    const releaseDate = safeString(meta.releaseDate);
    const totalTracks = safeNumber(meta.totalTracks);

    return joinParts(
      `Album: "${name}" by ${artistName}`,
      releaseDate ? ` (${releaseDate})` : null,
      totalTracks !== null ? `, ${totalTracks} tracks` : null,
    );
  },
};

export const SpotifyRecentlyPlayedFormatter: EntityFormatter<SpotifyRecentlyPlayedEntity> = {
  format: (meta) => {
    const trackName = safeString(meta.trackName, "Unknown Track");
    const artist = safeString(meta.artist, "Unknown Artist");
    const album = safeString(meta.album);
    const duration = safeNumber(meta.durationMs);
    const explicit = meta.explicit ? " [Explicit]" : "";
    const popularity = safeNumber(meta.popularity);
    const durationFormatted = duration
      ? `${Math.floor(duration / 60000)}:${String(Math.floor((duration % 60000) / 1000)).padStart(2, "0")}`
      : null;
    const vibeTag =
      popularity !== null && popularity >= 70
        ? " popular track"
        : popularity !== null && popularity <= 30
          ? " niche track"
          : "";

    return joinParts(
      `I played "${trackName}" by ${artist}`,
      album ? ` from ${album}` : null,
      durationFormatted ? ` (${durationFormatted})` : null,
      explicit,
      vibeTag,
    );
  },
};
