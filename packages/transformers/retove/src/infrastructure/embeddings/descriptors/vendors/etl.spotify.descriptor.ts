import type {
  SpotifyAlbumDataTarget,
  SpotifyArtistDataTarget,
  SpotifyPlaylistDataTarget,
  SpotifyTrackDataTarget,
} from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLSpotifyTrackDescriptor implements IETLEmbeddingDescriptor<SpotifyTrackDataTarget> {
  public getEmbeddingText(track: SpotifyTrackDataTarget): string {
    const parts = [
      `I listen to "${track.name}" by ${track.artist}`,
      track.album ? `from ${track.album}` : null,
      track.popularity && track.popularity > 70 ? "a widely appreciated track" : null,
      track.popularity && track.popularity < 30 ? "a niche find" : null,
    ].filter(Boolean);

    return parts.join(", ");
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SpotifyTrackDataTarget): U {
    return {
      __type: "track",
      ...entity,
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
    return {
      __type: "artist",
      ...entity,
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
    return {
      __type: "playlist",
      ...entity,
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
    return {
      __type: "album",
      ...entity,
    } as unknown as U;
  }
}

export const spotifyDescriptorsETL = {
  track: new ETLSpotifyTrackDescriptor(),
  artist: new ETLSpotifyArtistDescriptor(),
  playlist: new ETLSpotifyPlaylistDescriptor(),
  album: new ETLSpotifyAlbumDescriptor(),
};
