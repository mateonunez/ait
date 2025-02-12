import type { qdrant } from "@ait/qdrant";
import { RetoveGitHubRepositoryETL } from "../../etl/vendors/retove.github.repository.etl";
import type { getPostgresClient } from "@ait/postgres";
import { RetoveSpotifyAlbumETL } from "../../etl/vendors/retove.spotify.album.etl";
import { RetoveXTweetETL } from "../../etl/vendors/retove.x.tweet.etl";
import { RetoveSpotifyTrackETL } from "@/etl/vendors/retove.spotify.track.etl";
import { RetoveSpotifyArtistETL } from "@/etl/vendors/retove.spotify.artist.etl";
import { RetoveSpotifyPlaylistETL } from "@/etl/vendors/retove.spotify.playlist.etl";

export const SpotifyETLs = {
  track: "RetoveSpotifyTrackETL",
  artist: "RetoveSpotifyArtistETL",
  playlist: "RetoveSpotifyPlaylistETL",
  album: "RetoveSpotifyAlbumETL",
};

export const GitHubETLs = {
  repository: "RetoveGitHubRepositoryETL",
};

export const XETLs = {
  tweet: "RetoveXTweetETL",
};

const LIMIT = 1000;

export async function runSpotifyETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const spotifyTrackETL = new RetoveSpotifyTrackETL(pgClient, qdrantClient);
  console.log("🔍 Running RetoveSpotifyTrackETL with limit of 100...");
  await spotifyTrackETL.run(LIMIT);
  console.log("✅ RetoveSpotifyTrackETL process completed successfully!");

  const spotifyArtistETL = new RetoveSpotifyArtistETL(pgClient, qdrantClient);
  console.log("🔍 Running RetoveSpotifyArtistETL with limit of 100...");
  await spotifyArtistETL.run(LIMIT);
  console.log("✅ RetoveSpotifyArtistETL process completed successfully!");

  const spotifyPlaylistETL = new RetoveSpotifyPlaylistETL(pgClient, qdrantClient);
  console.log("🔍 Running RetoveSpotifyPlaylistETL with limit of 100...");
  await spotifyPlaylistETL.run(LIMIT);
  console.log("✅ RetoveSpotifyPlaylistETL process completed successfully!");

  const spotifyAlbumETL = new RetoveSpotifyAlbumETL(pgClient, qdrantClient);
  console.log("🔍 Running RetoveSpotifyAlbumETL with limit of 100...");
  await spotifyAlbumETL.run(LIMIT);
  console.log("✅ RetoveSpotifyAlbumETL process completed successfully!");
}

export async function runGitHubETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const githubETL = new RetoveGitHubRepositoryETL(pgClient, qdrantClient);

  console.log("🔍 Running RetoveGitHubRepositoryETL with limit of 100...");
  await githubETL.run(LIMIT);
  console.log("✅ RetoveGitHubRepositoryETL process completed successfully!");
}

export async function runXETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const xETL = new RetoveXTweetETL(pgClient, qdrantClient);

  console.log("🔍 Running RetoveXTweetETL with limit of 100...");
  await xETL.run(LIMIT);
  console.log("✅ RetoveXTweetETL process completed successfully!");
}
