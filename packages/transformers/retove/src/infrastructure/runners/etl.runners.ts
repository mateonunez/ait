import type { qdrant } from "@ait/qdrant";
import { RetoveGitHubRepositoryETL } from "../../etl/vendors/retove.github.repository.etl";
import { RetoveGitHubPullRequestETL } from "../../etl/vendors/retove.github.pull-request.etl";
import { RetoveGitHubCommitETL } from "../../etl/vendors/retove.github.commit.etl";
import type { getPostgresClient } from "@ait/postgres";
import { RetoveXTweetETL } from "../../etl/vendors/retove.x.tweet.etl";
import { RetoveSpotifyTrackETL } from "../../etl/vendors/retove.spotify.track.etl";
import { RetoveLinearIssueETL } from "../../etl/vendors/retove.linear.issue.etl";
import { RetoveSpotifyRecentlyPlayedETL } from "../../etl/vendors/retove.spotify.recently-played.etl";
import { RetoveSpotifyArtistETL } from "../../etl/vendors/retove.spotify.artist.etl";
import { RetoveSpotifyPlaylistETL } from "../../etl/vendors/retove.spotify.playlist.etl";
import { RetoveSpotifyAlbumETL } from "../../etl/vendors/retove.spotify.album.etl";
import { RetoveNotionPageETL } from "../../etl/vendors/retove.notion.page.etl";
import { RetoveSlackMessageETL } from "../../etl/vendors/retove.slack.message.etl";
import { RetoveGoogleCalendarEventETL } from "../../etl/vendors/retove.google-calendar.event.etl";
import { getCollectionNameByVendor } from "@ait/ai-sdk";

export const SpotifyETLs = {
  track: "RetoveSpotifyTrackETL",
  artist: "RetoveSpotifyArtistETL",
  playlist: "RetoveSpotifyPlaylistETL",
  album: "RetoveSpotifyAlbumETL",
  recentlyPlayed: "RetoveSpotifyRecentlyPlayedETL",
};

export const GitHubETLs = {
  repository: "RetoveGitHubRepositoryETL",
  pullRequest: "RetoveGitHubPullRequestETL",
  commit: "RetoveGitHubCommitETL",
};

export const XETLs = {
  tweet: "RetoveXTweetETL",
};

export const LinearETLs = {
  issue: "RetoveLinearIssueETL",
};

export const NotionETLs = {
  page: "RetoveNotionPageETL",
};

export const SlackETLs = {
  message: "RetoveSlackMessageETL",
};

export const GoogleCalendarETLs = {
  event: "RetoveGoogleCalendarEventETL",
};

const LIMIT = 100_000;

export async function runSpotifyTrackETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("spotify");
  const etl = new RetoveSpotifyTrackETL(pgClient, qdrantClient);
  console.log(`🔍 Running RetoveSpotifyTrackETL → ${collection} with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log(`✅ RetoveSpotifyTrackETL → ${collection} completed successfully!`);
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

export async function runGitHubRepositoryETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("github");
  const githubETL = new RetoveGitHubRepositoryETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveGitHubRepositoryETL → ${collection} with limit of ${LIMIT}...`);
  await githubETL.run(LIMIT);
  console.log(`✅ RetoveGitHubRepositoryETL → ${collection} completed successfully!`);
}

export async function runGitHubPullRequestETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveGitHubPullRequestETL(pgClient, qdrantClient);
  console.log(`🔍 Running RetoveGitHubPullRequestETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log("✅ RetoveGitHubPullRequestETL process completed successfully!");
}

export async function runGitHubCommitETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("github");
  const etl = new RetoveGitHubCommitETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveGitHubCommitETL → ${collection} with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  console.log(`✅ RetoveGitHubCommitETL → ${collection} completed successfully!`);
}

export async function runXETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("x");
  const xETL = new RetoveXTweetETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveXTweetETL → ${collection} with limit of ${LIMIT}...`);
  await xETL.run(LIMIT);
  console.log(`✅ RetoveXTweetETL → ${collection} completed successfully!`);
}

export async function runLinearETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("linear");
  const linearETL = new RetoveLinearIssueETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveLinearIssueETL → ${collection} with limit of ${LIMIT}...`);
  await linearETL.run(LIMIT);
  console.log(`✅ RetoveLinearIssueETL → ${collection} completed successfully!`);
}

export async function runNotionETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("notion");
  const notionETL = new RetoveNotionPageETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveNotionPageETL → ${collection} with limit of ${LIMIT}...`);
  await notionETL.run(LIMIT);
  console.log(`✅ RetoveNotionPageETL → ${collection} completed successfully!`);
}

export async function runSlackETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("slack");
  const slackETL = new RetoveSlackMessageETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveSlackMessageETL → ${collection} with limit of ${LIMIT}...`);
  await slackETL.run(LIMIT);
  console.log(`✅ RetoveSlackMessageETL → ${collection} completed successfully!`);
}

export async function runGoogleCalendarEventETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("google");
  const googleCalendarETL = new RetoveGoogleCalendarEventETL(pgClient, qdrantClient);

  console.log(`🔍 Running RetoveGoogleCalendarEventETL → ${collection} with limit of ${LIMIT}...`);
  await googleCalendarETL.run(LIMIT);
  console.log(`✅ RetoveGoogleCalendarEventETL → ${collection} completed successfully!`);
}
