import type { qdrant } from "@ait/qdrant";
import { RetoveSpotifyTrackETL } from "../../etl/vendors/retove.spotify.track.etl";
import { RetoveGitHubRepositoryETL } from "../../etl/vendors/retove.github.repository.etl";
import type { getPostgresClient } from "@ait/postgres";
import { RetoveSpotifyArtistETL } from "@/etl/vendors/retove.spotify.artist.etl";

export const SpotifyETLs = {
  track: "RetoveSpotifyTrackETL",
  artist: "RetoveSpotifyArtistETL",
};

export const GitHubETLs = {
  repository: "RetoveGitHubRepositoryETL",
};

export async function runSpotifyETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const spotifyTrackETL = new RetoveSpotifyTrackETL(pgClient, qdrantClient);

  console.log("🔍 Running RetoveSpotifyTrackETL with limit of 100...");
  await spotifyTrackETL.run(100);
  console.log("✅ RetoveSpotifyTrackETL process completed successfully!");

  const spotifyArtistETL = new RetoveSpotifyArtistETL(pgClient, qdrantClient);

  console.log("🔍 Running RetoveSpotifyArtistETL with limit of 100...");
  await spotifyArtistETL.run(100);
  console.log("✅ RetoveSpotifyArtistETL process completed successfully!");
}
export async function runGitHubETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const githubETL = new RetoveGitHubRepositoryETL(pgClient, qdrantClient);

  console.log("🔍 Running RetoveGitHubRepositoryETL with limit of 100...");
  await githubETL.run(100);
  console.log("✅ RetoveGitHubRepositoryETL process completed successfully!");
}
