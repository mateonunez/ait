import { getAIDescriptorService } from "@ait/ai-sdk";
import type {
  SpotifyAlbumDataTarget,
  SpotifyArtistDataTarget,
  SpotifyPlaylistDataTarget,
  SpotifyRecentlyPlayedDataTarget,
  SpotifyTrackDataTarget,
} from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

const aiDescriptor = getAIDescriptorService();

export class ETLSpotifyTrackDescriptor implements IETLEmbeddingDescriptor<SpotifyTrackDataTarget> {
  public async enrich(track: SpotifyTrackDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const result = await aiDescriptor.describeText(
        `${track.name} by ${track.artist}`,
        "Spotify Track Metadata Analysis",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }

  public getEmbeddingText(enriched: EnrichedEntity<SpotifyTrackDataTarget>): string {
    const { target: track, enrichment } = enriched;
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

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<SpotifyTrackDataTarget>): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      name: entityWithoutInternalTimestamps.name
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.name, 500)
        : null,
      artist: entityWithoutInternalTimestamps.artist
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.artist, 255)
        : null,
      album: entityWithoutInternalTimestamps.album
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.album, 255)
        : null,
    };

    return {
      __type: "track",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export class ETLSpotifyArtistDescriptor implements IETLEmbeddingDescriptor<SpotifyArtistDataTarget> {
  public async enrich(artist: SpotifyArtistDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const result = await aiDescriptor.describeText(
        `${artist.name} (Genres: ${artist.genres?.join(", ")})`,
        "Spotify Artist Semantic Context",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }
  public getEmbeddingText(enriched: EnrichedEntity<SpotifyArtistDataTarget>): string {
    const { target: artist, enrichment } = enriched;
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

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<SpotifyArtistDataTarget>): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "artist",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export class ETLSpotifyPlaylistDescriptor implements IETLEmbeddingDescriptor<SpotifyPlaylistDataTarget> {
  public async enrich(playlist: SpotifyPlaylistDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const tracks = playlist.tracks as Array<any>;
      const trackListing = tracks
        ?.slice(0, 5)
        .map((t) => (t?.track ? `${t.track.name} by ${t.track.artist}` : null))
        .filter(Boolean)
        .join(", ");

      const result = await aiDescriptor.describeText(
        `Playlist: ${playlist.name}\nDescription: ${playlist.description}\nSample Tracks: ${trackListing}`,
        "Spotify Playlist Vibe & Genre Analysis",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }

  public getEmbeddingText(enriched: EnrichedEntity<SpotifyPlaylistDataTarget>): string {
    const { target: playlist, enrichment } = enriched;
    // tracks is stored as JSONB - cast to expected structure
    const tracks = playlist.tracks as Array<{
      added_at?: string;
      track?: {
        id: string;
        name: string;
        artist: string;
        album: string | null;
        durationMs: number;
        uri: string | null;
      };
    }> | null;
    const trackCount = Array.isArray(tracks) ? tracks.length : 0;

    // Get first few track names for context
    const trackPreview = Array.isArray(tracks)
      ? tracks
          .slice(0, 5)
          .map((t) => (t?.track ? `"${t.track.name}" by ${t.track.artist}` : null))
          .filter(Boolean)
          .join("; ")
      : null;

    const visibilityLabel = playlist.collaborative ? "collaborative" : playlist.public ? "public" : "private";

    const parts = [
      `Playlist: "${playlist.name}"`,
      visibilityLabel,
      playlist.owner ? `by ${playlist.owner}` : null,
      playlist.description ? `${playlist.description}` : null,
      trackCount > 0 ? `${trackCount} tracks` : null,
      trackPreview ? `including: ${trackPreview}` : null,
      playlist.followers && playlist.followers > 0
        ? `${playlist.followers} follower${playlist.followers === 1 ? "" : "s"}`
        : null,
    ].filter(Boolean);

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(
    enriched: EnrichedEntity<SpotifyPlaylistDataTarget>,
  ): U {
    const { target: entity } = enriched;
    // Exclude large arrays that would bloat the Qdrant payload
    const { updatedAt: _updatedAt, tracks: rawTracks, ...entityWithoutLargeFields } = entity;

    // Extract track data in COMPACT format - name + artist only
    const tracks = rawTracks as Array<{
      added_at?: string;
      track?: {
        id: string;
        name: string;
        artist: string;
        album: string | null;
        durationMs: number;
        uri: string | null;
      };
    }> | null;

    const trackCount = Array.isArray(tracks) ? tracks.length : 0;

    const compactTracks = Array.isArray(tracks)
      ? tracks
          .filter((t) => t?.track?.name)
          .map((t) => {
            const artist = t.track!.artist || "Unknown";
            return `${t.track!.name} by ${artist}`;
          })
      : [];

    return {
      __type: "playlist",
      ...entityWithoutLargeFields,
      trackCount,
      tracks: compactTracks,
    } as unknown as U;
  }
}

export class ETLSpotifyAlbumDescriptor implements IETLEmbeddingDescriptor<SpotifyAlbumDataTarget> {
  public async enrich(album: SpotifyAlbumDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const result = await aiDescriptor.describeText(
        `${album.name} by ${album.artists?.join(" & ")} (Label: ${album.label})`,
        "Spotify Album Artistic Concept",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }

  public getEmbeddingText(enriched: EnrichedEntity<SpotifyAlbumDataTarget>): string {
    const { target: album, enrichment } = enriched;
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

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<SpotifyAlbumDataTarget>): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "album",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export class ETLSpotifyRecentlyPlayedDescriptor implements IETLEmbeddingDescriptor<SpotifyRecentlyPlayedDataTarget> {
  public async enrich(item: SpotifyRecentlyPlayedDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const result = await aiDescriptor.describeText(
        `Played ${item.trackName} by ${item.artist} at ${item.playedAt}`,
        "Spotify Listening Context Analysis",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }

  public getEmbeddingText(enriched: EnrichedEntity<SpotifyRecentlyPlayedDataTarget>): string {
    const { target: item, enrichment } = enriched;
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

    const baseText = parts.join(", ");
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(
    enriched: EnrichedEntity<SpotifyRecentlyPlayedDataTarget>,
  ): U {
    const { target: entity } = enriched;
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
