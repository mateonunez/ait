import type { GitHubRepositoryEntity, GitHubPullRequestEntity, GitHubCommitEntity } from "@ait/core";
import type { EntityFormatter } from "./formatter.utils";
import { safeString, safeNumber, joinParts } from "./formatter.utils";
import { TextNormalizationService } from "../../metadata/text-normalization.service";

const textNormalizer = new TextNormalizationService();

export const GitHubRepositoryFormatter: EntityFormatter<GitHubRepositoryEntity> = {
  format: (meta) => {
    const name = safeString(meta.fullName || meta.name, "Unknown Repository");
    const description = safeString(meta.description);
    const language = safeString(meta.language);
    const stars = safeNumber(meta.stars);
    const forks = safeNumber(meta.forks);
    const watchers = safeNumber(meta.watchersCount);
    const openIssues = safeNumber(meta.openIssuesCount);

    // Build comprehensive stats
    const stats: string[] = [];
    if (stars !== null) stats.push(`${stars} star${stars === 1 ? "" : "s"}`);
    if (forks !== null) stats.push(`${forks} fork${forks === 1 ? "" : "s"}`);
    if (watchers !== null && watchers > 0) stats.push(`${watchers} watcher${watchers === 1 ? "" : "s"}`);
    if (openIssues !== null) stats.push(`${openIssues} open issue${openIssues === 1 ? "" : "s"}`);

    // Build status indicators
    const statusParts: string[] = [];
    if (meta.archived) statusParts.push("archived");
    if (meta.private) statusParts.push("private");
    if (meta.fork) statusParts.push("fork");
    if (meta.isTemplate) statusParts.push("template");

    // Build features
    const features: string[] = [];
    if (meta.hasWiki) features.push("wiki");
    if (meta.hasDiscussions) features.push("discussions");
    if (meta.hasPages) features.push("GitHub Pages");

    // Build topics
    const topics = meta.topics && meta.topics.length > 0 ? `Topics: ${meta.topics.slice(0, 5).join(", ")}` : null;

    // Build license
    const license = meta.licenseName ? `License: ${meta.licenseName}` : null;

    return joinParts(
      `Repository: "${name}"`,
      statusParts.length > 0 ? ` [${statusParts.join(", ")}]` : null,
      description ? ` - ${description}` : null,
      language ? ` (${language})` : null,
      stats.length > 0 ? `. Stats: ${stats.join(", ")}` : null,
      features.length > 0 ? `. Features: ${features.join(", ")}` : null,
      topics ? `. ${topics}` : null,
      license ? `. ${license}` : null,
    );
  },
};

export const GitHubPullRequestFormatter: EntityFormatter<GitHubPullRequestEntity> = {
  format: (meta) => {
    const number = safeNumber(meta.number);
    const title = safeString(meta.title, "Unnamed PR");
    const state = safeString(meta.state);
    const merged = meta.merged ? "merged" : null;
    const draft = meta.draft ? "draft" : null;
    const repositoryName = safeString(meta.repositoryFullName || meta.repositoryName);
    const body = safeString(meta.body);

    // Build stats
    const stats: string[] = [];
    const additions = safeNumber(meta.additions);
    const deletions = safeNumber(meta.deletions);
    if (additions !== null || deletions !== null) {
      stats.push(`+${additions ?? 0}/-${deletions ?? 0}`);
    }

    const changedFiles = safeNumber(meta.changedFiles);
    if (changedFiles !== null && changedFiles > 0) {
      stats.push(`${changedFiles} file${changedFiles === 1 ? "" : "s"}`);
    }

    const commits = safeNumber(meta.commits);
    if (commits !== null && commits > 0) {
      stats.push(`${commits} commit${commits === 1 ? "" : "s"}`);
    }

    // Build action verb based on state
    let action = "I worked on PR";
    if (merged) action = "I merged PR";
    else if (state === "closed" && !merged) action = "I closed PR";
    else if (draft) action = "I drafted PR";
    else if (state === "open") action = "I opened PR";

    // Build repository context
    const repoContext = repositoryName ? ` in \`${repositoryName}\`` : "";

    // Include truncated body if available
    const bodyPreview = body && body.length > 0 ? `\nDescription: ${textNormalizer.truncate(body, 150)}` : "";

    return joinParts(
      `${action} #${number ?? "?"}${repoContext}`,
      `: "${title}"`,
      stats.length > 0 ? `. Changes: ${stats.join(", ")}` : null,
      bodyPreview,
    );
  },
};

export const GitHubCommitFormatter: EntityFormatter<GitHubCommitEntity> = {
  format: (meta) => {
    const sha = safeString(meta.sha, "");
    const shortSha = sha.length >= 7 ? sha.substring(0, 7) : sha;
    const message = safeString(meta.message, "No commit message");
    const messageBody = safeString(meta.messageBody);
    const repositoryName = safeString(meta.repositoryFullName || meta.repositoryName);
    const authorName = safeString(meta.authorName);
    const committerName = safeString(meta.committerName);

    // Build stats
    const stats: string[] = [];
    const additions = safeNumber(meta.additions);
    const deletions = safeNumber(meta.deletions);
    if (additions !== null || deletions !== null) {
      stats.push(`+${additions ?? 0}/-${deletions ?? 0}`);
    }

    const total = safeNumber(meta.total);
    if (total !== null && total > 0) {
      stats.push(`${total} total changes`);
    }

    // Count files from filesData if available
    let fileCount = 0;
    if (meta.filesData && Array.isArray(meta.filesData)) {
      fileCount = meta.filesData.length;
    }

    if (fileCount > 0) {
      stats.push(`${fileCount} file${fileCount === 1 ? "" : "s"}`);
    }

    // Build author info
    const authorInfo = authorName ? ` by ${authorName}` : "";
    const committerInfo = committerName && committerName !== authorName ? ` (committed by ${committerName})` : "";

    // Build repository context
    const repoContext = repositoryName ? ` in \`${repositoryName}\`` : "";

    // Include truncated message body if available
    const bodyPreview =
      messageBody && messageBody.length > 0 ? `\nDescription: ${textNormalizer.truncate(messageBody, 150)}` : "";

    // Build verification status
    let verified = "";
    if (meta.verification && typeof meta.verification === "object") {
      const verification = meta.verification as any;
      if (verification.verified) {
        verified = " [verified]";
      }
    }

    return joinParts(
      `I committed ${shortSha}${repoContext}${authorInfo}${committerInfo}`,
      `: "${message}"`,
      stats.length > 0 ? `. Changes: ${stats.join(", ")}` : null,
      verified,
      bodyPreview,
    );
  },
};
