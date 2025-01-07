import type { SpotifyTrackDataTarget } from "@ait/postgres";
import type { BaseVectorPoint } from "../retove.base-etl.abstract";

export interface RetoveSpotifyTrackVectorPoint extends BaseVectorPoint {
  payload: {
    type: "track";
  } & Partial<SpotifyTrackDataTarget>;
}

/**
 * Union type for Spotify vector points
 */
export type RetoveSpotifyVectorPoint = RetoveSpotifyTrackVectorPoint;
