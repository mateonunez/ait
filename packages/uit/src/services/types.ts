export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  counts: Record<string, number>;
}

// GitHub Types
export interface GitHubOwner {
  login?: string;
  avatar_url?: string;
  html_url?: string;
  type?: string;
}

export interface GitHubUser {
  login?: string;
  avatar_url?: string;
  html_url?: string;
}

export interface GitHubRepository {
  id: string;
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  url: string;
  language: string | null;
  fullName: string | null;
  private: boolean | null;
  fork: boolean | null;
  archived: boolean | null;
  pushedAt: Date | null;
  ownerData?: GitHubOwner | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  draft: boolean | null;
  merged: boolean | null;
  mergedAt: Date | null;
  closedAt: Date | null;
  htmlUrl: string;
  repositoryName: string | null;
  repositoryFullName: string | null;
  additions: number | null;
  deletions: number | null;
  changedFiles: number | null;
  commits: number | null;
  comments: number | null;
  reviewComments: number | null;
  mergeable: boolean | null;
  rebaseable: boolean | null;
  mergeableState: string | null;
  authorAssociation: string | null;
  autoMerge: boolean | null;
  prCreatedAt: Date | null;
  prUpdatedAt: Date | null;
  userData?: GitHubUser | null;
  assigneesData?: { [key: string]: unknown } | null;
  requestedReviewersData?: { [key: string]: unknown } | null;
  labels?: { [key: string]: unknown }[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Spotify Types
export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyAlbumData {
  images?: SpotifyImage[];
  [key: string]: unknown;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string | null;
  durationMs: number;
  explicit: boolean;
  popularity: number | null;
  previewUrl: string | null;
  albumData?: SpotifyAlbumData | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  popularity: number | null;
  genres: string[] | null;
  images?: SpotifyImage[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  public: boolean;
  collaborative: boolean;
  owner: string;
  tracks: string[] | null;
  followers: number;
  uri: string;
  href: string;
  images?: SpotifyImage[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  albumType: string;
  artists: string[] | null;
  totalTracks: number;
  releaseDate: string | null;
  popularity: number | null;
  uri: string;
  href: string;
  images?: SpotifyImage[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SpotifyRecentlyPlayed {
  id: string;
  trackId: string;
  trackName: string;
  artist: string;
  album: string | null;
  durationMs: number;
  explicit: boolean;
  popularity: number | null;
  playedAt: Date;
  context?: {
    type: string;
    uri: string;
    [key: string]: unknown;
  } | null;
  albumData?: SpotifyAlbumData | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// X (Twitter) Types
export interface XTweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string | null;
  authorName: string | null;
  lang: string | null;
  retweetCount: number | null;
  likeCount: number | null;
  replyCount: number | null;
  quoteCount: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Linear Types
export interface LinearIssue {
  id: string;
  title: string;
  description: string | null;
  state: string;
  priority: number | null;
  assigneeId: string | null;
  assigneeName: string | null;
  teamId: string;
  teamName: string | null;
  projectId: string | null;
  projectName: string | null;
  url: string;
  labels: string[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
