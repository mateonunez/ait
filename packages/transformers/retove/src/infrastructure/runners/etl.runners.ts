import type { qdrant } from "@ait/qdrant";
import { RetoveGitHubRepositoryETL } from "../../etl/vendors/retove.github.repository.etl";
import type { getPostgresClient } from "@ait/postgres";
import { RetoveXTweetETL } from "../../etl/vendors/retove.x.tweet.etl";
import { RetoveSpotifyTrackETL } from "../../etl/vendors/retove.spotify.track.etl";
import { RetoveLinearIssueETL } from "../../etl/vendors/retove.linear.issue.etl";
import { RetoveSpotifyRecentlyPlayedETL } from "../../etl/vendors/retove.spotify.recently-played.etl";
import { RetoveSpotifyArtistETL } from "../../etl/vendors/retove.spotify.artist.etl";
import { RetoveSpotifyPlaylistETL } from "../../etl/vendors/retove.spotify.playlist.etl";
import { RetoveSpotifyAlbumETL } from "../../etl/vendors/retove.spotify.album.etl";

export const SpotifyETLs = {
  track: "RetoveSpotifyTrackETL",
  artist: "RetoveSpotifyArtistETL",
  playlist: "RetoveSpotifyPlaylistETL",
  album: "RetoveSpotifyAlbumETL",
  recentlyPlayed: "RetoveSpotifyRecentlyPlayedETL",
};

export const GitHubETLs = {
  repository: "RetoveGitHubRepositoryETL",
};

export const XETLs = {
  tweet: "RetoveXTweetETL",
};

export const LinearETLs = {
  issue: "RetoveLinearIssueETL",
};

const LIMIT = 1000;

export async function runSpotifyTrackETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyTrackETL(pgClient, qdrantClient);
  console.log(`🔍 Running RetoveSpotifyTrackETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log("✅ RetoveSpotifyTrackETL process completed successfully!");
}

export async function runSpotifyArtistETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyArtistETL(pgClient, qdrantClient);
  console.log(`🔍 Running RetoveSpotifyArtistETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log("✅ RetoveSpotifyArtistETL process completed successfully!");
}

export async function runSpotifyPlaylistETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyPlaylistETL(pgClient, qdrantClient);
  console.log(`🔍 Running RetoveSpotifyPlaylistETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log("✅ RetoveSpotifyPlaylistETL process completed successfully!");
}

export async function runSpotifyAlbumETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyAlbumETL(pgClient, qdrantClient);
  console.log(`🔍 Running RetoveSpotifyAlbumETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log("✅ RetoveSpotifyAlbumETL process completed successfully!");
}

export async function runSpotifyRecentlyPlayedETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyRecentlyPlayedETL(pgClient, qdrantClient);
  console.log(`🔍 Running RetoveSpotifyRecentlyPlayedETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log("✅ RetoveSpotifyRecentlyPlayedETL process completed successfully!");
}

export async function runGitHubETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const githubETL = new RetoveGitHubRepositoryETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveGitHubRepositoryETL with limit of ${LIMIT}...`);
  await githubETL.run(LIMIT);
  console.log("✅ RetoveGitHubRepositoryETL process completed successfully!");
}

export async function runXETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const xETL = new RetoveXTweetETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveXTweetETL with limit of ${LIMIT}...`);
  await xETL.run(LIMIT);
  console.log("✅ RetoveXTweetETL process completed successfully!");
}

export async function runLinearETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const linearETL = new RetoveLinearIssueETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveLinearIssueETL with limit of ${LIMIT}...`);
  await linearETL.run(LIMIT);
  console.log("✅ RetoveLinearIssueETL process completed successfully!");
}
