import type { GitHubCommitEntity, GitHubRepositoryExternal } from "@ait/core";

/**
 * Extract repository information from commit HTML URL
 * Format: https://github.com/{owner}/{repo}/commit/{sha}
 */
function extractRepositoryFromUrl(htmlUrl: string): { owner: string; repo: string } | null {
  try {
    const url = new URL(htmlUrl);
    const parts = url.pathname.split("/").filter((p) => p.length > 0);
    if (parts.length >= 3 && parts[1] === "commit") {
      return {
        owner: parts[0] ?? "",
        repo: parts[1] === "commit" ? (parts[0] ?? "") : (parts[1] ?? ""),
      };
    }
    // Correct format: /owner/repo/commit/sha
    if (parts.length >= 3) {
      return {
        owner: parts[0] ?? "",
        repo: parts[1] ?? "",
      };
    }
  } catch {
    // Invalid URL
  }
  return null;
}

/**
 * Enrich commit domain entity with repository context
 */
export function enrichCommitWithRepository(
  commit: GitHubCommitEntity,
  repository: GitHubRepositoryExternal,
): GitHubCommitEntity {
  return {
    ...commit,
    repositoryId: repository.id.toString(),
    repositoryName: repository.name,
    repositoryFullName:
      repository.full_name || (repository as any).fullName || `${repository.owner?.login}/${repository.name}`,
  };
}

/**
 * Extract repository info from commit URL and enrich commit
 * Fallback method when repository context is not available
 */
export function enrichCommitWithRepositoryFromUrl(commit: GitHubCommitEntity): GitHubCommitEntity {
  const repoInfo = extractRepositoryFromUrl(commit.htmlUrl);
  if (repoInfo) {
    return {
      ...commit,
      repositoryName: repoInfo.repo,
      repositoryFullName: `${repoInfo.owner}/${repoInfo.repo}`,
    };
  }
  return commit;
}
