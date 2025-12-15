import { z } from "zod";
import type { Tool } from "../../types/tools";

/**
 * Schema for fetching a file from GitHub
 */
export const githubGetFileSchema = z.object({
  repo: z.string().describe("Repository full name (owner/repo), e.g. 'mateonunez/ait'"),
  branch: z.string().default("main").describe("Branch name, defaults to 'main'"),
  path: z.string().describe("File path within repository, e.g. 'packages/ai-sdk/src/index.ts'"),
});

/**
 * Schema for searching code within GitHub repository files
 */
export const githubSearchSchema = z.object({
  repo: z.string().describe("Repository full name (owner/repo), e.g. 'mateonunez/ait'"),
  branch: z.string().default("main").describe("Branch name, defaults to 'main'"),
  query: z.string().describe("Search query - substring to find in file contents"),
  maxResults: z.number().default(10).describe("Maximum number of matching files to return"),
});

export type GitHubGetFileInput = z.infer<typeof githubGetFileSchema>;
export type GitHubSearchInput = z.infer<typeof githubSearchSchema>;

/**
 * Find lines in content that match the query and return context
 */
function findMatchingLines(
  content: string,
  query: string,
  contextLines = 2,
): Array<{ lineNumber: number; line: string; context: string[] }> {
  const lines = content.split("\n");
  const matches: Array<{ lineNumber: number; line: string; context: string[] }> = [];
  const queryLower = query.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.toLowerCase().includes(queryLower)) {
      const start = Math.max(0, i - contextLines);
      const end = Math.min(lines.length, i + contextLines + 1);
      const context = lines.slice(start, end);
      matches.push({
        lineNumber: i + 1, // 1-indexed
        line,
        context,
      });
    }
  }

  return matches;
}

/**
 * Interface for file repository dependency
 */
export interface IGitHubFileRepositoryForTools {
  getFilesByRepository(
    repositoryFullName: string,
    params?: { branch?: string },
  ): Promise<Array<{ path: string; sha: string; content?: string | null; branch?: string }>>;
}

/**
 * Interface for data source dependency (GitHub API fallback)
 */
export interface IGitHubDataSourceForTools {
  fetchFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string>;
}

/**
 * Create GitHub tools for file retrieval and code search.
 *
 * These tools allow the AI to:
 * 1. Fetch exact file contents (prefers cached DB, falls back to GitHub API)
 * 2. Search for code patterns within stored repository files
 *
 * @param fileRepository - Repository for accessing cached files from DB
 * @param dataSource - GitHub API data source for fallback fetches
 */
export function createGitHubTools(
  fileRepository: IGitHubFileRepositoryForTools,
  dataSource?: IGitHubDataSourceForTools,
): Record<string, Tool> {
  return {
    /**
     * Fetch exact file contents from a GitHub repository.
     * Prefers cached data from the database, falls back to GitHub API if not found.
     */
    github_getFile: {
      description:
        "Fetch the exact contents of a file from a GitHub repository. " +
        "Use this when you need to see the full implementation of a specific file. " +
        "Prefers cached data, falls back to GitHub API.",
      parameters: githubGetFileSchema,
      execute: async (args: GitHubGetFileInput) => {
        const { repo, branch, path } = args;

        try {
          // Try DB first (cached files)
          const files = await fileRepository.getFilesByRepository(repo);
          const cached = files.find((f) => f.path === path && (!f.branch || f.branch === branch));

          if (cached?.content) {
            return {
              success: true,
              source: "cache",
              repo,
              branch,
              path,
              content: cached.content,
              sha: cached.sha,
            };
          }

          // Fallback to GitHub API if data source provided
          if (dataSource) {
            const [owner, repoName] = repo.split("/");
            if (owner && repoName) {
              const content = await dataSource.fetchFileContent(owner, repoName, path, branch);
              return {
                success: true,
                source: "github",
                repo,
                branch,
                path,
                content,
              };
            }
          }

          return {
            success: false,
            error: `File not found: ${repo}:${path} (branch: ${branch})`,
            suggestion: "The file may not be indexed. Try refreshing the repository files.",
          };
        } catch (error) {
          return {
            success: false,
            error: `Failed to fetch file: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },

    /**
     * Search for code patterns within stored repository files.
     * Searches file content for substring matches and returns matching files with line numbers.
     */
    github_search: {
      description:
        "Search for code patterns within a GitHub repository. " +
        "Use this when looking for specific functions, classes, or code patterns. " +
        "Returns matching files with line numbers and context.",
      parameters: githubSearchSchema,
      execute: async (args: GitHubSearchInput) => {
        const { repo, branch, query, maxResults } = args;

        try {
          // Get all files for the repository
          const files = await fileRepository.getFilesByRepository(repo);
          const branchFiles = files.filter((f) => !f.branch || f.branch === branch);

          // Search for matches
          const results: Array<{
            path: string;
            matches: Array<{ lineNumber: number; line: string; context: string[] }>;
          }> = [];

          for (const file of branchFiles) {
            if (!file.content) continue;

            const matches = findMatchingLines(file.content, query, 2);
            if (matches.length > 0) {
              results.push({
                path: file.path,
                matches: matches.slice(0, 5), // Limit matches per file
              });

              if (results.length >= maxResults) break;
            }
          }

          return {
            success: true,
            repo,
            branch,
            query,
            totalMatches: results.length,
            results: results.map((r) => ({
              path: r.path,
              matchCount: r.matches.length,
              matches: r.matches.map((m) => ({
                line: m.lineNumber,
                text: m.line.trim().substring(0, 200), // Truncate long lines
                context: m.context.join("\n"),
              })),
            })),
          };
        } catch (error) {
          return {
            success: false,
            error: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
  };
}
