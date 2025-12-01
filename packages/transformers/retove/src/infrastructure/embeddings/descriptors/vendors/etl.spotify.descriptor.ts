import type {
  SpotifyAlbumDataTarget,
  SpotifyArtistDataTarget,
  SpotifyPlaylistDataTarget,
  SpotifyRecentlyPlayedDataTarget,
  SpotifyTrackDataTarget,
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

    const parts = [
      `Saved track: "${track.name}" by ${primaryArtist}`,
      durationStr ? `(${durationStr})` : null,
      albumName ? `from "${albumName}"` : null,
      releaseDate ? `released ${(releaseDate as string).split("-")[0]}` : null,
      albumType && albumType !== "album" ? albumType : null,
      track.explicit ? "explicit" : null,
      track.popularity && track.popularity > 70 ? "popular" : null,
      track.popularity && track.popularity < 30 ? "underground" : null,
      track.addedAt
        ? `added ${new Date(track.addedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
        : null,
    ].filter(Boolean);

    return parts.join(", ");
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
    const popularity = artist.popularity ?? 0;
    let popularityLabel = "";
    if (popularity > 80) {
      popularityLabel = "globally renowned";
    } else if (popularity > 60) {
      popularityLabel = "well-known";
    } else if (popularity > 40) {
      popularityLabel = "emerging";
    } else if (popularity > 0) {
      popularityLabel = "underground";
    }

    const parts = [
      `Followed artist: ${artist.name}`,
      popularityLabel ? popularityLabel : null,
      artist.genres && artist.genres.length > 0 ? `genres: ${artist.genres.slice(0, 3).join(", ")}` : null,
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

    const visibilityLabel = playlist.collaborative ? "collaborative" : playlist.public ? "public" : "private";

    const parts = [
      `Playlist: "${playlist.name}"`,
      visibilityLabel,
      playlist.owner ? `by ${playlist.owner}` : null,
      playlist.description ? `${playlist.description}` : null,
      trackCount > 0 ? `${trackCount} tracks` : null,
      playlist.followers && playlist.followers > 0
        ? `${playlist.followers} follower${playlist.followers === 1 ? "" : "s"}`
        : null,
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
    const albumType = album.albumType || "album";

    const parts = [
      `Saved ${albumType}: "${album.name}"`,
      album.artists && album.artists.length > 0 ? `by ${album.artists.slice(0, 2).join(" & ")}` : null,
      album.releaseDate ? `(${album.releaseDate.split("-")[0]})` : null,
      album.totalTracks ? `${album.totalTracks} tracks` : null,
      album.genres && album.genres.length > 0 ? `genres: ${album.genres.slice(0, 2).join(", ")}` : null,
      album.label ? `label: ${album.label}` : null,
      album.popularity && album.popularity > 70 ? "popular" : null,
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
    const dateStr = playedDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = playedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    const minutes = Math.floor(item.durationMs / 60000);
    const seconds = Math.floor((item.durationMs % 60000) / 1000);
    const durationStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    // Extract listening context
    let contextInfo = "";
    if (item.context && typeof item.context === "object") {
      const ctx = item.context as { type?: string };
      if (ctx.type === "playlist") contextInfo = "via playlist";
      else if (ctx.type === "album") contextInfo = "via album";
      else if (ctx.type === "artist") contextInfo = "via artist radio";
      else if (ctx.type === "collection") contextInfo = "from liked songs";
    }

    const parts = [
      `Played: "${item.trackName}" by ${item.artist}`,
      `on ${dateStr} at ${timeStr}`,
      item.album ? `from "${item.album}"` : null,
      durationStr ? `(${durationStr})` : null,
      contextInfo ? contextInfo : null,
      item.explicit ? "explicit" : null,
    ].filter(Boolean);

    return parts.join(", ");
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
