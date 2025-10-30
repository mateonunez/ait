import type {
  SpotifyAlbumDataTarget,
  SpotifyArtistDataTarget,
  SpotifyPlaylistDataTarget,
  SpotifyTrackDataTarget,
  SpotifyRecentlyPlayedDataTarget,
} from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLSpotifyTrackDescriptor implements IETLEmbeddingDescriptor<SpotifyTrackDataTarget> {
  public getEmbeddingText(track: SpotifyTrackDataTarget): string {
    const albumData = track.albumData as Record<string, unknown>;
    const artistsData = track.artistsData as Array<Record<string, unknown>>;
    const primaryArtist = artistsData?.[0]?.name || track.artist;
    const albumName = albumData?.name || track.album;
    const releaseDate = albumData?.release_date;
    const albumType = albumData?.album_type;

    const minutes = Math.floor(track.durationMs / 60000);
    const seconds = Math.floor((track.durationMs % 60000) / 1000);
    const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    let temporalContext = "";
    if (track.addedAt) {
      const now = new Date();
      const addedDate = new Date(track.addedAt);
      const daysDiff = Math.floor((now.getTime() - addedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 7) {
        temporalContext = "recently added";
      } else if (daysDiff < 30) {
        temporalContext = `added ${Math.floor(daysDiff / 7)} weeks ago`;
      } else if (daysDiff < 365) {
        temporalContext = `discovered ${Math.floor(daysDiff / 30)} months ago`;
      } else {
        temporalContext = `added ${Math.floor(daysDiff / 365)} years ago`;
      }
    }

    const parts = [
      temporalContext ? `I ${temporalContext}` : "I listen to",
      `"${track.name}" by ${primaryArtist}`,
      durationStr ? `a ${durationStr} ${albumType || "track"}` : null,
      albumName
        ? `from the ${releaseDate ? (releaseDate as string).split("-")[0] : ""} ${albumType || "album"} "${albumName}"`
        : null,
      releaseDate
        ? `released on ${new Date(releaseDate as string).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
        : null,
      track.explicit ? "This explicit track" : "This track",
      track.popularity && track.popularity > 70 ? "is widely appreciated and popular" : null,
      track.popularity && track.popularity < 30 ? "is a niche find with unique appeal" : null,
      track.popularity && track.popularity >= 30 && track.popularity <= 70
        ? `has moderate popularity (${track.popularity}/100)`
        : null,
    ].filter(Boolean);

    return parts.join(" ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SpotifyTrackDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "track",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export class ETLSpotifyArtistDescriptor implements IETLEmbeddingDescriptor<SpotifyArtistDataTarget> {
  public getEmbeddingText(artist: SpotifyArtistDataTarget): string {
    const parts = [
      `I follow ${artist.name}`,
      artist.genres && artist.genres.length > 0 ? `exploring ${artist.genres.slice(0, 3).join(", ")}` : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SpotifyArtistDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "artist",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export class ETLSpotifyPlaylistDescriptor implements IETLEmbeddingDescriptor<SpotifyPlaylistDataTarget> {
  public getEmbeddingText(playlist: SpotifyPlaylistDataTarget): string {
    let trackCount = 0;
    if (playlist.tracks && Array.isArray(playlist.tracks)) {
      const totalEntry = playlist.tracks.find((t) => t.startsWith("total:"));
      if (totalEntry) {
        const match = totalEntry.match(/total:\s*(\d+)/);
        if (match) {
          trackCount = Number.parseInt(match[1], 10);
        }
      }
    }

    const parts = [
      `My playlist "${playlist.name}"`,
      playlist.description ? `${playlist.description}` : null,
      trackCount > 0 ? `${trackCount} tracks I curated` : null,
      playlist.followers && playlist.followers > 0 ? `${playlist.followers} people following it` : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SpotifyPlaylistDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "playlist",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export class ETLSpotifyAlbumDescriptor implements IETLEmbeddingDescriptor<SpotifyAlbumDataTarget> {
  public getEmbeddingText(album: SpotifyAlbumDataTarget): string {
    const parts = [
      `I have ${album.name}`,
      album.artists && album.artists.length > 0 ? `by ${album.artists.slice(0, 2).join(", ")}` : null,
      album.releaseDate ? `from ${album.releaseDate.split("-")[0]}` : null,
      album.genres && album.genres.length > 0 ? `${album.genres.slice(0, 2).join(", ")}` : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SpotifyAlbumDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "album",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export class ETLSpotifyRecentlyPlayedDescriptor implements IETLEmbeddingDescriptor<SpotifyRecentlyPlayedDataTarget> {
  public getEmbeddingText(item: SpotifyRecentlyPlayedDataTarget): string {
    const playedDate = new Date(item.playedAt);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - playedDate.getTime()) / (1000 * 60));

    let temporalContext = "";
    if (minutesAgo < 5) {
      temporalContext = "just now";
    } else if (minutesAgo < 60) {
      temporalContext = `${minutesAgo} minutes ago`;
    } else if (minutesAgo < 1440) {
      // Less than a day
      const hoursAgo = Math.floor(minutesAgo / 60);
      temporalContext = `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`;
    } else {
      const daysAgo = Math.floor(minutesAgo / 1440);
      temporalContext = `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`;
    }

    const minutes = Math.floor(item.durationMs / 60000);
    const seconds = Math.floor((item.durationMs % 60000) / 1000);
    const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    const parts = [
      `I played ${temporalContext}`,
      `"${item.trackName}" by ${item.artist}`,
      item.album ? `from ${item.album}` : null,
      durationStr ? `(${durationStr})` : null,
      item.explicit ? "explicit track" : null,
      item.popularity && item.popularity > 70 ? "popular track" : null,
    ].filter(Boolean);

    return parts.join(" ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SpotifyRecentlyPlayedDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "recently_played",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export const spotifyDescriptorsETL = {
  track: new ETLSpotifyTrackDescriptor(),
  artist: new ETLSpotifyArtistDescriptor(),
  playlist: new ETLSpotifyPlaylistDescriptor(),
  album: new ETLSpotifyAlbumDescriptor(),
  recentlyPlayed: new ETLSpotifyRecentlyPlayedDescriptor(),
};
