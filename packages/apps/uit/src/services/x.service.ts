import { requestJson } from "@ait/core";
import type { PaginatedResponse, PaginationParams, RefreshResponse, XTweetEntity as XTweet } from "@ait/core";
import { apiConfig, buildQueryString } from "../config/api.config";

export class XService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${apiConfig.gatewayUrl}/api/x`;
  }

  async fetchTweets(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/tweets${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<XTweet>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async refresh() {
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh`, { method: "POST" });
    if (!result.ok) throw result.error;
    return result.value.data;
  }
}

export const xService = new XService();
