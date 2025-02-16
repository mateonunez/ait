import type {
  SpotifyAlbumDataTarget,
  SpotifyArtistDataTarget,
  SpotifyPlaylistDataTarget,
  SpotifyTrackDataTarget,
} from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLSpotifyTrackDescriptor implements IETLEmbeddingDescriptor<SpotifyTrackDataTarget> {
  public getEmbeddingText(track: SpotifyTrackDataTarget): string {
    const jsonStr = JSON.stringify(track);
    return jsonStr.replace(/{/g, "{{").replace(/}/g, "}}");
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
    const jsonStr = JSON.stringify(artist);
    return jsonStr.replace(/{/g, "{{").replace(/}/g, "}}");
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
    const jsonStr = JSON.stringify(playlist);
    return jsonStr.replace(/{/g, "{{").replace(/}/g, "}}");
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
    const jsonStr = JSON.stringify(album);
    return jsonStr.replace(/{/g, "{{").replace(/}/g, "}}");
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
