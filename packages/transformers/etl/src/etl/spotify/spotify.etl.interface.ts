import type { SpotifyTrackDataTarget } from "@ait/postgres";
import type { BaseVectorPoint } from "../etl.abstract";

export interface SpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    type: "track";
  } & Partial<SpotifyTrackDataTarget>;
}

/**
 * Union type for Spotify vector points
 */
export type SpotifyVectorPoint = SpotifyTrackVectorPoint;
