import type { GitHubRepositoryDataTarget } from "@ait/postgres";
import type { IETLEmbeddingDescriptor } from "../etl.embedding.descriptor.interface";

export class ETLGitHubRepositoryDescriptor implements IETLEmbeddingDescriptor<GitHubRepositoryDataTarget> {
  public getEmbeddingText(repository: GitHubRepositoryDataTarget): string {
    const parts: string[] = [];

    // Repository name and description
    const repoName = repository.fullName || repository.name;
    parts.push(`I maintain ${repoName}`);

    // Activity status and state
    const activityStatus = this._getActivityStatus(repository);
    if (activityStatus) {
      parts.push(activityStatus);
    }

    // Visibility and fork status
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

    return `${parts.join(", ")}.`;
  }

  private _getActivityStatus(repository: GitHubRepositoryDataTarget): string | null {
    if (repository.archived) {
      return "an archived project";
    }

    if (repository.disabled) {
      return "a disabled repository";
    }

    if (repository.pushedAt) {
      const daysSinceLastPush = this._getDaysSince(repository.pushedAt);
      if (daysSinceLastPush < 30) {
        return "an actively developed repository";
      }
      if (daysSinceLastPush < 180) {
        return "a recently updated repository";
      }
      return "a mature repository";
    }

    return "a repository";
  }

  private _getVisibilityInfo(repository: GitHubRepositoryDataTarget): string | null {
    const parts: string[] = [];

    if (repository.visibility) {
      parts.push(`${repository.visibility} repository`);
    } else if (repository.private) {
      parts.push("private repository");
    }

    if (repository.fork) {
      parts.push("forked from another project");
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

  private _getDaysSince(date: Date | string): number {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  public getEmbeddingPayload<U extends Record<string, unknown>>(entity: GitHubRepositoryDataTarget): U {
    const { updatedAt: _updatedAt, ...entityWithoutInternalTimestamps } = entity;
    return {
      __type: "repository",
      ...entityWithoutInternalTimestamps,
    } as unknown as U;
  }
}

export const githubDescriptorsETL = {
  repository: new ETLGitHubRepositoryDescriptor(),
};
