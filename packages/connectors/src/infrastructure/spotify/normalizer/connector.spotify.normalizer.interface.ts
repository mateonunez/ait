export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration: number;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NormalizedSpotifyTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration: number;
  popularity: number;
  createdAt: Date;
  updatedAt: Date;
}
