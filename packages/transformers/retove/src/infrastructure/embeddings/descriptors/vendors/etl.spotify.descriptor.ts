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
    // Add popularity context
    let popularityContext = "";
    const popularity = artist.popularity ?? 0;
    if (popularity > 80) {
      popularityContext = "a globally renowned artist";
    } else if (popularity > 60) {
      popularityContext = "a well-known artist";
    } else if (popularity > 40) {
      popularityContext = "an emerging artist";
    } else if (popularity > 0) {
      popularityContext = "an underground artist";
    }

    const parts = [
      `I follow ${artist.name}`,
      popularityContext ? popularityContext : null,
      artist.genres && artist.genres.length > 0 ? `creating ${artist.genres.slice(0, 3).join(", ")} music` : null,
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

    // Add ownership and sharing context
    const ownershipText = playlist.collaborative
      ? "I collaborate on the playlist"
      : playlist.public
        ? "I curate the public playlist"
        : "I maintain the private playlist";

    const parts = [
      `${ownershipText} "${playlist.name}"`,
      playlist.description ? `${playlist.description}` : null,
      trackCount > 0 ? `containing ${trackCount} carefully selected tracks` : null,
      playlist.followers && playlist.followers > 0
        ? `followed by ${playlist.followers} listener${playlist.followers === 1 ? "" : "s"}`
        : null,
      playlist.owner ? `created by ${playlist.owner}` : null,
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
    // Add album type context (album, single, compilation)
    let albumTypeText = "album";
    if (album.albumType === "single") {
      albumTypeText = "single";
    } else if (album.albumType === "compilation") {
      albumTypeText = "compilation";
    }

    // Add popularity context if available
    let popularityContext = "";
    if (album.popularity && album.popularity > 70) {
      popularityContext = "widely acclaimed";
    } else if (album.popularity && album.popularity < 30) {
      popularityContext = "a deep cut";
    }

    const parts = [
      `I have the ${albumTypeText} "${album.name}"`,
      album.artists && album.artists.length > 0 ? `by ${album.artists.slice(0, 2).join(" & ")}` : null,
      album.releaseDate ? `released in ${album.releaseDate.split("-")[0]}` : null,
      popularityContext ? popularityContext : null,
      album.totalTracks ? `featuring ${album.totalTracks} tracks` : null,
      album.genres && album.genres.length > 0 ? `exploring ${album.genres.slice(0, 2).join(", ")}` : null,
      album.label ? `on ${album.label}` : null,
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

    // CRITICAL: Extract listening context (playlist, album, artist radio, etc.)
    let contextInfo = "";
    if (item.context && typeof item.context === "object") {
      const ctx = item.context as { type?: string; uri?: string };
      const contextType = ctx.type;
      const contextUri = ctx.uri;

      if (contextType === "playlist" && contextUri) {
        contextInfo = "from a playlist";
      } else if (contextType === "album") {
        contextInfo = "from the album";
      } else if (contextType === "artist") {
        contextInfo = "from artist radio";
      } else if (contextType === "collection") {
        contextInfo = "from my liked songs";
      }
    }

    const parts = [
      `I played ${temporalContext}`,
      `"${item.trackName}" by ${item.artist}`,
      contextInfo ? contextInfo : null,
      item.album ? `${item.album}` : null,
      durationStr ? `(${durationStr})` : null,
      item.explicit ? "explicit" : null,
      item.popularity && item.popularity > 70 ? "highly popular" : null,
      item.popularity && item.popularity < 30 ? "niche discovery" : null,
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
