import { requestJson } from "@ait/core";
import type {
  PaginatedResponse,
  PaginationParams,
  RefreshResponse,
  SlackMessageEntity as SlackMessage,
} from "@ait/core";

const BASE_URL = import.meta.env.VITE_API_URL || "https://localhost:3000";

export class SlackService {
  private baseUrl: string;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = `${baseUrl}/api/slack`;
  }

  async fetchMessages(params?: PaginationParams) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const url = `${this.baseUrl}/data/messages${queryParams.toString() ? `?${queryParams}` : ""}`;
    const result = await requestJson<PaginatedResponse<SlackMessage>>(url);

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

export const slackService = new SlackService();
