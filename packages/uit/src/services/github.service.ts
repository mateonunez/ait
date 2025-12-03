import { requestJson } from "@ait/core";
import type {
  GitHubCommitEntity as GitHubCommit,
  GitHubPullRequestEntity as GitHubPullRequest,
  GitHubRepositoryEntity as GitHubRepository,
  PaginatedResponse,
  PaginationParams,
  RefreshResponse,
} from "@ait/core";
import { apiConfig, buildQueryString } from "../config/api.config";

export class GithubService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${apiConfig.gatewayUrl}/api/github`;
  }

  async fetchRepositories(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/repositories${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GitHubRepository>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchPullRequests(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/pull-requests${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GitHubPullRequest>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async fetchCommits(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/commits${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<GitHubCommit>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async refresh() {
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh`, { method: "POST" });
    if (!result.ok) throw result.error;
    return result.value.data;
  }
}

export const githubService = new GithubService();
