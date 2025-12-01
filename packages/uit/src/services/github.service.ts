import { requestJson } from "@ait/core";
import type {
  GitHubCommitEntity as GitHubCommit,
  GitHubPullRequestEntity as GitHubPullRequest,
  GitHubRepositoryEntity as GitHubRepository,
  PaginatedResponse,
  PaginationParams,
  RefreshResponse,
} from "@ait/core";

const BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";

export class GitHubService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = `${baseUrl}/api/github`;
  }

  async fetchRepositories(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/repositories${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<GitHubRepository>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async fetchPullRequests(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/pull-requests${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<GitHubPullRequest>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async fetchCommits(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/commits${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<GitHubCommit>>(url);

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }

  async refresh() {
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh`, {
      method: "POST",
    });

    if (!result.ok) {
      throw result.error;
    }

    return result.value.data;
  }
}

export const githubService = new GitHubService();
