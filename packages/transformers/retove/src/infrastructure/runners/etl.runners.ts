import type { qdrant } from "@ait/qdrant";
import { RetoveSpotifyTrackETL } from "../../etl/vendors/retove.spotify.track.etl";
import { RetoveGitHubRepositoryETL } from "../../etl/vendors/retove.github.repository.etl";
import type { getPostgresClient } from "@ait/postgres";

// Refactor this as soon as possible

export const SpotifyETLs = {
  track: "RetoveSpotifyTrackETL",
};

export const GitHubETLs = {
  repository: "RetoveGitHubRepositoryETL",
};

export async function runSpotifyETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const spotifyETL = new RetoveSpotifyTrackETL(pgClient, qdrantClient);

  console.log("🔍 Running RetoveSpotifyTrackETL with limit of 100...");
  await spotifyETL.run(100);
  console.log("✅ RetoveSpotifyTrackETL process completed successfully!");
}
export async function runGitHubETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const githubETL = new RetoveGitHubRepositoryETL(pgClient, qdrantClient);

  console.log("🔍 Running RetoveGitHubRepositoryETL with limit of 100...");
  await githubETL.run(100);
  console.log("✅ RetoveGitHubRepositoryETL process completed successfully!");
}
