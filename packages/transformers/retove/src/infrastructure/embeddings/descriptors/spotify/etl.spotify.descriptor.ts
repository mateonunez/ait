import type { SpotifyTrackDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLSpotifyTrackDescriptor implements IETLEmbeddingDescriptor<SpotifyTrackDataTarget> {
  public getEmbeddingText(track: SpotifyTrackDataTarget): string {
    return `${track.name} ${track.artist} ${track.album ?? ""}`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: SpotifyTrackDataTarget): U {
    return {
      type: "track",
      ...entity,
    } as unknown as U;
  }
}

export const spotifyDescriptorsETL = {
  track: new ETLSpotifyTrackDescriptor(),
};
