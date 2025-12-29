import { getAIDescriptorService } from "@ait/ai-sdk";
import type { GitHubCommitDataTarget, GitHubPullRequestDataTarget, GitHubRepositoryDataTarget } from "@ait/postgres";
import { formatEnrichmentForText } from "../../../../utils/enrichment-formatter.util";
import { TextSanitizer } from "../../../../utils/text-sanitizer.util";
import type { EnrichedEntity, EnrichmentResult, IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";
import { ETLGitHubFileDescriptor } from "./etl.github.file.descriptor";

const aiDescriptor = getAIDescriptorService();

export class ETLGitHubRepositoryDescriptor implements IETLEmbeddingDescriptor<GitHubRepositoryDataTarget> {
  public async enrich(repository: GitHubRepositoryDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const result = await aiDescriptor.describeText(
        `${repository.fullName}: ${repository.description}`,
        "GitHub Repository Functional Analysis",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }

  public getEmbeddingText(enriched: EnrichedEntity<GitHubRepositoryDataTarget>): string {
    const { target: repository, enrichment } = enriched;
    const parts: string[] = [];

    // Repository identity - factual, third-person description
    const repoName = repository.fullName || repository.name;
    if (repository.fork) {
      parts.push(`Repository \`${repoName}\` (forked)`);
    } else {
      parts.push(`Repository \`${repoName}\``);
    }

    // CRITICAL: Include the repository description for semantic understanding
    if (repository.description) {
      const sanitizedDescription = TextSanitizer.sanitize(repository.description, 300);
      if (sanitizedDescription) {
        parts.push(`${sanitizedDescription}`);
      }
    }

    // Activity status and state
    const activityStatus = this._getActivityStatus(repository);
    if (activityStatus) {
      parts.push(activityStatus);
    }

    // Visibility and template status
    const visibilityInfo = this._getVisibilityInfo(repository);
    if (visibilityInfo) {
      parts.push(visibilityInfo);
    }

    // Community engagement
    const engagementInfo = this._getEngagementInfo(repository);
    if (engagementInfo) {
      parts.push(engagementInfo);
    }

    // Technology and topics
    const techInfo = this._getTechnologyInfo(repository);
    if (techInfo) {
      parts.push(techInfo);
    }

    // Features availability
    const featuresInfo = this._getFeaturesInfo(repository);
    if (featuresInfo) {
      parts.push(featuresInfo);
    }

    // License information
    if (repository.licenseName) {
      parts.push(`licensed under ${repository.licenseName}`);
    }

    // Repository maturity and size
    const maturityInfo = this._getMaturityInfo(repository);
    if (maturityInfo) {
      parts.push(maturityInfo);
    }

    const baseText = `${parts.join(", ")}.`;
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  private _getActivityStatus(repository: GitHubRepositoryDataTarget): string | null {
    if (repository.archived) {
      return "an archived project";
    }

    if (repository.disabled) {
      return "a disabled repository";
    }

    // Use absolute date instead of relative time to avoid stale embeddings
    if (repository.pushedAt) {
      return `last pushed on ${this._formatDate(repository.pushedAt)}`;
    }

    return "a repository";
  }

  private _getVisibilityInfo(repository: GitHubRepositoryDataTarget): string | null {
    const parts: string[] = [];

    if (repository.visibility) {
      parts.push(`${repository.visibility}`);
    } else if (repository.private) {
      parts.push("private");
    }

    if (repository.isTemplate) {
      parts.push("template repository");
    }

    return parts.length > 0 ? parts.join(", ") : null;
  }

  private _getEngagementInfo(repository: GitHubRepositoryDataTarget): string | null {
    const stats: string[] = [];

    if (repository.stars && repository.stars > 0) {
      stats.push(`${repository.stars} star${repository.stars === 1 ? "" : "s"}`);
    }

    if (repository.forks && repository.forks > 0) {
      stats.push(`${repository.forks} fork${repository.forks === 1 ? "" : "s"}`);
    }

    if (repository.watchersCount && repository.watchersCount > 0) {
      stats.push(`${repository.watchersCount} watcher${repository.watchersCount === 1 ? "" : "s"}`);
    }

    if (repository.openIssuesCount !== null && repository.openIssuesCount !== undefined) {
      stats.push(`${repository.openIssuesCount} open issue${repository.openIssuesCount === 1 ? "" : "s"}`);
    }

    return stats.length > 0 ? `with ${stats.join(", ")}` : null;
  }

  private _getTechnologyInfo(repository: GitHubRepositoryDataTarget): string | null {
    const parts: string[] = [];

    if (repository.language) {
      parts.push(`${repository.language} project`);
    }

    if (repository.topics && repository.topics.length > 0) {
      const topicsStr = repository.topics.slice(0, 5).join(", ");
      parts.push(`focusing on ${topicsStr}`);
    }

    return parts.length > 0 ? parts.join(" ") : null;
  }

  private _getFeaturesInfo(repository: GitHubRepositoryDataTarget): string | null {
    const features: string[] = [];

    if (repository.hasIssues) {
      features.push("issue tracking");
    }

    if (repository.hasWiki) {
      features.push("wiki");
    }

    if (repository.hasDiscussions) {
      features.push("discussions");
    }

    if (repository.hasProjects) {
      features.push("project boards");
    }

    if (repository.hasPages) {
      features.push("GitHub Pages");
    }

    return features.length > 0 ? `includes ${features.join(", ")}` : null;
  }

  private _getMaturityInfo(repository: GitHubRepositoryDataTarget): string | null {
    const parts: string[] = [];

    if (repository.createdAt) {
      const createdDate = new Date(repository.createdAt);
      const monthYear = createdDate.toLocaleDateString("en-US", { year: "numeric", month: "long" });
      parts.push(`created in ${monthYear}`);
    }

    if (repository.size && repository.size > 0) {
      const sizeStr = repository.size >= 1024 ? `${Math.round(repository.size / 1024)} MB` : `${repository.size} KB`;
      parts.push(`grown to ${sizeStr}`);
    }

    if (repository.defaultBranch) {
      parts.push(`default branch: ${repository.defaultBranch}`);
    }

    return parts.length > 0 ? parts.join(", ") : null;
  }

  /**
   * Format date as absolute, stable string for embeddings.
   * Using absolute dates prevents embeddings from becoming stale.
   */
  private _formatDate(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(
    enriched: EnrichedEntity<GitHubRepositoryDataTarget>,
  ): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    // CRITICAL: Sanitize all text fields in the payload to prevent JSON encoding errors
    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      name: TextSanitizer.sanitize(entityWithoutInternalTimestamps.name, 255),
      fullName: entityWithoutInternalTimestamps.fullName
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.fullName, 512)
        : null,
      description: entityWithoutInternalTimestamps.description
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.description, 1000)
        : null,
    };

    return {
      __type: "repository",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export class ETLGitHubPullRequestDescriptor implements IETLEmbeddingDescriptor<GitHubPullRequestDataTarget> {
  public async enrich(pullRequest: GitHubPullRequestDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const result = await aiDescriptor.describeText(
        `Title: ${pullRequest.title}\nBody: ${pullRequest.body}`,
        "GitHub Pull Request Intent & Impact",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }
  public getEmbeddingText(enriched: EnrichedEntity<GitHubPullRequestDataTarget>): string {
    const { target: pullRequest, enrichment } = enriched;
    const parts: string[] = [];

    // PR identity - factual, third-person description
    const sanitizedTitle = TextSanitizer.sanitize(pullRequest.title, 200);
    parts.push(`PR #${pullRequest.number}: "${sanitizedTitle}"`);

    // Repository context (if available)
    const repoName = pullRequest.repositoryFullName || pullRequest.repositoryName;
    if (repoName) {
      parts.push(`in \`${repoName}\``);
    } else if (pullRequest.repositoryId) {
      parts.push(`in repository ${pullRequest.repositoryId}`);
    }

    // Author information - who created this PR
    const authorInfo = this._getAuthorInfo(pullRequest);
    if (authorInfo) {
      parts.push(authorInfo);
    }

    // CRITICAL: Include PR body/description for context about WHY changes were made
    if (pullRequest.body && pullRequest.body.trim().length > 0) {
      const sanitizedBody = TextSanitizer.sanitize(pullRequest.body, 300);
      if (sanitizedBody) {
        parts.push(`Description: ${sanitizedBody}`);
      }
    }

    // State and draft status
    const stateInfo = this._getStateInfo(pullRequest);
    if (stateInfo) {
      parts.push(stateInfo);
    }

    // Code change stats
    const codeStats = this._getCodeStats(pullRequest);
    if (codeStats) {
      parts.push(codeStats);
    }

    // Review and comment stats
    const reviewStats = this._getReviewStats(pullRequest);
    if (reviewStats) {
      parts.push(reviewStats);
    }

    // Labels
    if (pullRequest.labels && Array.isArray(pullRequest.labels) && pullRequest.labels.length > 0) {
      const labelNames = pullRequest.labels
        .map((label: any) => label.name)
        .filter(Boolean)
        .slice(0, 5)
        .join(", ");
      if (labelNames) {
        parts.push(`labeled as ${labelNames}`);
      }
    }

    // Milestone
    if (pullRequest.milestoneData && typeof pullRequest.milestoneData === "object") {
      const milestone = pullRequest.milestoneData as any;
      if (milestone.title) {
        parts.push(`milestone: ${milestone.title}`);
      }
    }

    // Branch information
    const branchInfo = this._getBranchInfo(pullRequest);
    if (branchInfo) {
      parts.push(branchInfo);
    }

    // Timeline
    const timelineInfo = this._getTimelineInfo(pullRequest);
    if (timelineInfo) {
      parts.push(timelineInfo);
    }

    const baseText = `${parts.join(", ")}.`;
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  private _getAuthorInfo(pullRequest: GitHubPullRequestDataTarget): string | null {
    if (pullRequest.userData && typeof pullRequest.userData === "object") {
      const user = pullRequest.userData as any;
      if (user.login) {
        return `authored by ${user.login}`;
      }
    }
    return null;
  }

  private _getStateInfo(pullRequest: GitHubPullRequestDataTarget): string | null {
    const stateParts: string[] = [];

    if (pullRequest.merged) {
      stateParts.push("merged");
      if (pullRequest.mergedByData && typeof pullRequest.mergedByData === "object") {
        const mergedBy = pullRequest.mergedByData as any;
        if (mergedBy.login) {
          stateParts.push(`by ${mergedBy.login}`);
        }
      }
    } else if (pullRequest.state === "closed") {
      stateParts.push("closed");
    } else if (pullRequest.state === "open") {
      if (pullRequest.draft) {
        stateParts.push("draft PR");
      } else {
        stateParts.push("open");
      }
    }

    return stateParts.length > 0 ? stateParts.join(" ") : null;
  }

  private _getCodeStats(pullRequest: GitHubPullRequestDataTarget): string | null {
    const stats: string[] = [];

    const additions = pullRequest.additions ?? 0;
    const deletions = pullRequest.deletions ?? 0;
    const changedFiles = pullRequest.changedFiles ?? 0;

    if (additions > 0 || deletions > 0) {
      stats.push(`+${additions} -${deletions} lines`);
    }

    if (changedFiles > 0) {
      stats.push(`${changedFiles} file${changedFiles === 1 ? "" : "s"}`);
    }

    if (pullRequest.commits && pullRequest.commits > 0) {
      stats.push(`${pullRequest.commits} commit${pullRequest.commits === 1 ? "" : "s"}`);
    }

    return stats.length > 0 ? `across ${stats.join(", ")}` : null;
  }

  private _getReviewStats(pullRequest: GitHubPullRequestDataTarget): string | null {
    const stats: string[] = [];

    const comments = pullRequest.comments ?? 0;
    const reviewComments = pullRequest.reviewComments ?? 0;

    if (comments > 0) {
      stats.push(`${comments} comment${comments === 1 ? "" : "s"}`);
    }

    if (reviewComments > 0) {
      stats.push(`${reviewComments} review comment${reviewComments === 1 ? "" : "s"}`);
    }

    return stats.length > 0 ? stats.join(", ") : null;
  }

  private _getBranchInfo(pullRequest: GitHubPullRequestDataTarget): string | null {
    const parts: string[] = [];

    if (pullRequest.headRef && pullRequest.baseRef) {
      parts.push(`from ${pullRequest.headRef} to ${pullRequest.baseRef}`);
    }

    return parts.length > 0 ? parts.join(" ") : null;
  }

  /**
   * Get timeline info using absolute dates (not relative) to prevent stale embeddings.
   */
  private _getTimelineInfo(pullRequest: GitHubPullRequestDataTarget): string | null {
    if (pullRequest.mergedAt) {
      return `merged on ${this._formatDate(pullRequest.mergedAt)}`;
    }

    if (pullRequest.closedAt) {
      return `closed on ${this._formatDate(pullRequest.closedAt)}`;
    }

    if (pullRequest.createdAt) {
      return `created on ${this._formatDate(pullRequest.createdAt)}`;
    }

    return null;
  }

  /**
   * Format date as absolute, stable string for embeddings.
   */
  private _formatDate(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(
    enriched: EnrichedEntity<GitHubPullRequestDataTarget>,
  ): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      title: TextSanitizer.sanitize(entityWithoutInternalTimestamps.title, 500),
      body: entityWithoutInternalTimestamps.body
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.body, 2000)
        : null,
    };

    return {
      __type: "pull_request",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export class ETLGitHubCommitDescriptor implements IETLEmbeddingDescriptor<GitHubCommitDataTarget> {
  public async enrich(commit: GitHubCommitDataTarget, options?: any): Promise<EnrichmentResult | null> {
    try {
      const result = await aiDescriptor.describeText(
        `Message: ${commit.message}\n${commit.messageBody || ""}`,
        "GitHub Commit Intent Analysis",
        { correlationId: options?.correlationId },
      );

      return result;
    } catch (error) {
      return null;
    }
  }

  public getEmbeddingText(enriched: EnrichedEntity<GitHubCommitDataTarget>): string {
    const { target: commit, enrichment } = enriched;
    const parts: string[] = [];

    // Commit identity - factual, third-person description
    const commitSha = commit.sha.substring(0, 7);
    parts.push(`Commit ${commitSha}`);

    // Repository context
    const repoName = commit.repositoryFullName || commit.repositoryName;
    if (repoName) {
      parts.push(`in \`${repoName}\``);
    } else if (commit.repositoryId) {
      parts.push(`in repository ${commit.repositoryId}`);
    }

    // Author information - who wrote this commit
    const authorInfo = this._getAuthorInfo(commit);
    if (authorInfo) {
      parts.push(authorInfo);
    }

    // CRITICAL: Include commit message (subject) for semantic understanding
    if (commit.message) {
      const sanitizedMessage = TextSanitizer.sanitize(commit.message, 200);
      if (sanitizedMessage) {
        parts.push(`message: "${sanitizedMessage}"`);
      }
    }

    // CRITICAL: Include commit message body for context about WHY changes were made
    if (commit.messageBody && commit.messageBody.trim().length > 0) {
      const sanitizedBody = TextSanitizer.sanitize(commit.messageBody, 300);
      if (sanitizedBody) {
        parts.push(`Description: ${sanitizedBody}`);
      }
    }

    // Code change stats
    const codeStats = this._getCodeStats(commit);
    if (codeStats) {
      parts.push(codeStats);
    }

    // File changes information
    const fileInfo = this._getFileInfo(commit);
    if (fileInfo) {
      parts.push(fileInfo);
    }

    // Verification status
    if (commit.verification && typeof commit.verification === "object") {
      const verification = commit.verification as any;
      if (verification.verified) {
        parts.push("verified commit");
      }
    }

    // Timeline
    const timelineInfo = this._getTimelineInfo(commit);
    if (timelineInfo) {
      parts.push(timelineInfo);
    }

    const baseText = `${parts.join(", ")}.`;
    return `${baseText}${formatEnrichmentForText(enrichment)}`;
  }

  private _getAuthorInfo(commit: GitHubCommitDataTarget): string | null {
    const parts: string[] = [];

    if (commit.authorName) {
      parts.push(`by ${commit.authorName}`);
      if (commit.authorEmail) {
        parts.push(`(${commit.authorEmail})`);
      }
    }

    return parts.length > 0 ? parts.join(" ") : null;
  }

  private _getCodeStats(commit: GitHubCommitDataTarget): string | null {
    const stats: string[] = [];

    const additions = commit.additions ?? 0;
    const deletions = commit.deletions ?? 0;
    const total = commit.total ?? 0;

    if (additions > 0 || deletions > 0) {
      stats.push(`+${additions} -${deletions} lines`);
    }

    if (total > 0) {
      stats.push(`${total} total changes`);
    }

    return stats.length > 0 ? `with ${stats.join(", ")}` : null;
  }

  private _getFileInfo(commit: GitHubCommitDataTarget): string | null {
    if (commit.filesData && Array.isArray(commit.filesData) && commit.filesData.length > 0) {
      const fileCount = commit.filesData.length;
      const fileNames = commit.filesData
        .slice(0, 5)
        .map((file: any) => file.filename)
        .filter(Boolean)
        .join(", ");

      if (fileNames) {
        return `affecting ${fileCount} file${fileCount === 1 ? "" : "s"}: ${fileNames}`;
      }
      return `affecting ${fileCount} file${fileCount === 1 ? "" : "s"}`;
    }

    return null;
  }

  /**
   * Get timeline info using absolute dates (not relative) to prevent stale embeddings.
   */
  private _getTimelineInfo(commit: GitHubCommitDataTarget): string | null {
    if (commit.authorDate) {
      return `committed on ${this._formatDate(commit.authorDate)}`;
    }

    if (commit.committerDate) {
      return `committed on ${this._formatDate(commit.committerDate)}`;
    }

    return null;
  }

  /**
   * Format date as absolute, stable string for embeddings.
   */
  private _formatDate(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(enriched: EnrichedEntity<GitHubCommitDataTarget>): U {
    const { target: entity } = enriched;
    const { updatedAt: _updatedAt, createdAt: _createdAt, ...entityWithoutInternalTimestamps } = entity;

    const sanitizedPayload = {
      ...entityWithoutInternalTimestamps,
      message: TextSanitizer.sanitize(entityWithoutInternalTimestamps.message, 500),
      messageBody: entityWithoutInternalTimestamps.messageBody
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.messageBody, 2000)
        : null,
      repositoryName: entityWithoutInternalTimestamps.repositoryName
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.repositoryName, 255)
        : null,
      repositoryFullName: entityWithoutInternalTimestamps.repositoryFullName
        ? TextSanitizer.sanitize(entityWithoutInternalTimestamps.repositoryFullName, 512)
        : null,
      committedAt: entityWithoutInternalTimestamps.authorDate || entityWithoutInternalTimestamps.committerDate,
    };

    return {
      __type: "commit",
      ...sanitizedPayload,
    } as unknown as U;
  }
}

export const githubDescriptorsETL = {
  repository: new ETLGitHubRepositoryDescriptor(),
  pullRequest: new ETLGitHubPullRequestDescriptor(),
  commit: new ETLGitHubCommitDescriptor(),
  file: new ETLGitHubFileDescriptor(),
};
