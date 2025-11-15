import { requestJson } from "@ait/core";
import type { PaginationParams, PaginatedResponse, RefreshResponse, XTweetEntity as XTweet } from "@ait/core";

const BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";

export class XService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = `${baseUrl}/api/x`;
  }

  async fetchTweets(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/tweets${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<XTweet>>(url);

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

export const xService = new XService();
