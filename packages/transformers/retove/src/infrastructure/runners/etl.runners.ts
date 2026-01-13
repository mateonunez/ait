import { getCollectionNameByVendor } from "@ait/ai-sdk";
import { getLogger } from "@ait/core";
import type { getPostgresClient } from "@ait/postgres";
import type { qdrant } from "@ait/qdrant";
import { RetoveGitHubCommitETL } from "../../etl/vendors/retove.github.commit.etl";
import { RetoveGitHubFileETL } from "../../etl/vendors/retove.github.file.etl";
import { RetoveGitHubIssueETL } from "../../etl/vendors/retove.github.issue.etl";
import { RetoveGitHubPullRequestETL } from "../../etl/vendors/retove.github.pull-request.etl";
import { RetoveGitHubRepositoryETL } from "../../etl/vendors/retove.github.repository.etl";
import { RetoveGoogleCalendarEventETL } from "../../etl/vendors/retove.google-calendar.event.etl";
import { RetoveGoogleContactETL } from "../../etl/vendors/retove.google-contact.etl";
import { RetoveGooglePhotoETL } from "../../etl/vendors/retove.google-photo.etl";
import { RetoveGoogleYouTubeSubscriptionETL } from "../../etl/vendors/retove.google-youtube.subscription.etl";
import { RetoveGoogleGmailMessageETL } from "../../etl/vendors/retove.google.gmail.message.etl";
import { RetoveLinearIssueETL } from "../../etl/vendors/retove.linear.issue.etl";
import { RetoveNotionPageETL } from "../../etl/vendors/retove.notion.page.etl";
import { RetoveSlackMessageETL } from "../../etl/vendors/retove.slack.message.etl";
import { RetoveSpotifyAlbumETL } from "../../etl/vendors/retove.spotify.album.etl";
import { RetoveSpotifyArtistETL } from "../../etl/vendors/retove.spotify.artist.etl";
import { RetoveSpotifyPlaylistETL } from "../../etl/vendors/retove.spotify.playlist.etl";
import { RetoveSpotifyRecentlyPlayedETL } from "../../etl/vendors/retove.spotify.recently-played.etl";
import { RetoveSpotifyTrackETL } from "../../etl/vendors/retove.spotify.track.etl";
import { RetoveXTweetETL } from "../../etl/vendors/retove.x.tweet.etl";

const logger = getLogger();

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
  issue: "RetoveGitHubIssueETL",
  file: "RetoveGitHubFileETL",
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

export const GooglePhotosETLs = {
  photo: "RetoveGooglePhotoETL",
};

export const GooglePeopleETLs = {
  contact: "RetoveGoogleContactETL",
};

export const GoogleYouTubeETLs = {
  subscription: "RetoveGoogleYouTubeSubscriptionETL",
};

export const GoogleGmailETLs = {
  message: "RetoveGoogleGmailMessageETL",
};

const LIMIT = 100_000;

export async function runSpotifyTrackETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("spotify");
  const etl = new RetoveSpotifyTrackETL(pgClient, qdrantClient);
  logger.info(`🔍 Running RetoveSpotifyTrackETL → ${collection} with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info(`✅ RetoveSpotifyTrackETL → ${collection} completed successfully!`);
}

export async function runSpotifyArtistETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyArtistETL(pgClient, qdrantClient);
  logger.info(`🔍 Running RetoveSpotifyArtistETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info("✅ RetoveSpotifyArtistETL process completed successfully!");
}

export async function runSpotifyPlaylistETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyPlaylistETL(pgClient, qdrantClient);
  logger.info(`🔍 Running RetoveSpotifyPlaylistETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info("✅ RetoveSpotifyPlaylistETL process completed successfully!");
}

export async function runSpotifyAlbumETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyAlbumETL(pgClient, qdrantClient);
  logger.info(`🔍 Running RetoveSpotifyAlbumETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info("✅ RetoveSpotifyAlbumETL process completed successfully!");
}

export async function runSpotifyRecentlyPlayedETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveSpotifyRecentlyPlayedETL(pgClient, qdrantClient);
  logger.info(`🔍 Running RetoveSpotifyRecentlyPlayedETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info("✅ RetoveSpotifyRecentlyPlayedETL process completed successfully!");
}

export async function runGitHubRepositoryETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("github");
  const githubETL = new RetoveGitHubRepositoryETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGitHubRepositoryETL → ${collection} with limit of ${LIMIT}...`);
  await githubETL.run(LIMIT);
  logger.info(`✅ RetoveGitHubRepositoryETL → ${collection} completed successfully!`);
}

export async function runGitHubPullRequestETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveGitHubPullRequestETL(pgClient, qdrantClient);
  logger.info(`🔍 Running RetoveGitHubPullRequestETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info("✅ RetoveGitHubPullRequestETL process completed successfully!");
}

export async function runGitHubCommitETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("github");
  const etl = new RetoveGitHubCommitETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGitHubCommitETL → ${collection} with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info(`✅ RetoveGitHubCommitETL → ${collection} completed successfully!`);
}

export async function runGitHubFileETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("github");
  const etl = new RetoveGitHubFileETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGitHubFileETL → ${collection} with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info(`✅ RetoveGitHubFileETL → ${collection} completed successfully!`);
}

export async function runGitHubIssueETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const etl = new RetoveGitHubIssueETL(pgClient, qdrantClient);
  logger.info(`🔍 Running RetoveGitHubIssueETL with limit of ${LIMIT}...`);
  await etl.run(LIMIT);
  logger.info("✅ RetoveGitHubIssueETL process completed successfully!");
}

export async function runXETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("x");
  const xETL = new RetoveXTweetETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveXTweetETL → ${collection} with limit of ${LIMIT}...`);
  await xETL.run(LIMIT);
  logger.info(`✅ RetoveXTweetETL → ${collection} completed successfully!`);
}

export async function runLinearETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("linear");
  const linearETL = new RetoveLinearIssueETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveLinearIssueETL → ${collection} with limit of ${LIMIT}...`);
  await linearETL.run(LIMIT);
  logger.info(`✅ RetoveLinearIssueETL → ${collection} completed successfully!`);
}

export async function runNotionETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("notion");
  const notionETL = new RetoveNotionPageETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveNotionPageETL → ${collection} with limit of ${LIMIT}...`);
  await notionETL.run(LIMIT);
  logger.info(`✅ RetoveNotionPageETL → ${collection} completed successfully!`);
}

export async function runSlackETL(qdrantClient: qdrant.QdrantClient, pgClient: ReturnType<typeof getPostgresClient>) {
  const collection = getCollectionNameByVendor("slack");
  const slackETL = new RetoveSlackMessageETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveSlackMessageETL → ${collection} with limit of ${LIMIT}...`);
  await slackETL.run(LIMIT);
  logger.info(`✅ RetoveSlackMessageETL → ${collection} completed successfully!`);
}

export async function runGoogleCalendarEventETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("google");
  const googleCalendarETL = new RetoveGoogleCalendarEventETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGoogleCalendarEventETL → ${collection} with limit of ${LIMIT}...`);
  await googleCalendarETL.run(LIMIT);
  logger.info(`✅ RetoveGoogleCalendarEventETL → ${collection} completed successfully!`);
}

export async function runGoogleYouTubeSubscriptionETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("google");
  const googleYouTubeETL = new RetoveGoogleYouTubeSubscriptionETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGoogleYouTubeSubscriptionETL → ${collection} with limit of ${LIMIT}...`);
  await googleYouTubeETL.run(LIMIT);
  logger.info(`✅ RetoveGoogleYouTubeSubscriptionETL → ${collection} completed successfully!`);
}

export async function runGoogleContactETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("google");
  const googleContactETL = new RetoveGoogleContactETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGoogleContactETL → ${collection} with limit of ${LIMIT}...`);
  await googleContactETL.run(LIMIT);
  logger.info(`✅ RetoveGoogleContactETL → ${collection} completed successfully!`);
}

export async function runGooglePhotoETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("google");
  const googlePhotoETL = new RetoveGooglePhotoETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGooglePhotoETL → ${collection} with limit of ${LIMIT}...`);
  await googlePhotoETL.run(LIMIT);
  logger.info(`✅ RetoveGooglePhotoETL → ${collection} completed successfully!`);
}

export async function runGoogleGmailMessageETL(
  qdrantClient: qdrant.QdrantClient,
  pgClient: ReturnType<typeof getPostgresClient>,
) {
  const collection = getCollectionNameByVendor("google");
  const gmailETL = new RetoveGoogleGmailMessageETL(pgClient, qdrantClient);

  logger.info(`🔍 Running RetoveGoogleGmailMessageETL → ${collection} with limit of ${LIMIT}...`);
  await gmailETL.run(LIMIT);
  logger.info(`✅ RetoveGoogleGmailMessageETL → ${collection} completed successfully!`);
}
