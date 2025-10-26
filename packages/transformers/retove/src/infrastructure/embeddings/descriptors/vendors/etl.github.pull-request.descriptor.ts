import type { GitHubPullRequestDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLGitHubPullRequestDescriptor implements IETLEmbeddingDescriptor<GitHubPullRequestDataTarget> {
  public getEmbeddingText(pullRequest: GitHubPullRequestDataTarget): string {
    const parts: string[] = [];

    // PR title and number
    const prIdentifier = `PR #${pullRequest.number} '${pullRequest.title}'`;
    parts.push(`I ${this._getAuthorAction(pullRequest)} ${prIdentifier}`);

    // Repository context (if available)
    if (pullRequest.repositoryId) {
      parts.push(`in repository ${pullRequest.repositoryId}`);
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

    return `${parts.join(", ")}.`;
  }

  private _getAuthorAction(pullRequest: GitHubPullRequestDataTarget): string {
    if (pullRequest.userData && typeof pullRequest.userData === "object") {
      const user = pullRequest.userData as any;
      if (user.login) {
        return "created";
      }
    }
    return "have";
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

  private _getTimelineInfo(pullRequest: GitHubPullRequestDataTarget): string | null {
    if (pullRequest.mergedAt) {
      const daysSinceMerge = this._getDaysSince(pullRequest.mergedAt);
      return `merged ${this._formatDaysAgo(daysSinceMerge)}`;
    }

    if (pullRequest.closedAt) {
      const daysSinceClosed = this._getDaysSince(pullRequest.closedAt);
      return `closed ${this._formatDaysAgo(daysSinceClosed)}`;
    }

    if (pullRequest.createdAt) {
      const daysSinceCreated = this._getDaysSince(pullRequest.createdAt);
      return `created ${this._formatDaysAgo(daysSinceCreated)}`;
    }

    return null;
  }

  private _getDaysSince(date: Date | string): number {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private _formatDaysAgo(days: number): string {
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GitHubPullRequestDataTarget): U {
    return {
      __type: "pull_request",
      ...entity,
    } as unknown as U;
  }
}
