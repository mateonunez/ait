import { requestJson } from "@ait/core";
import type {
  PaginatedResponse,
  PaginationParams,
  RefreshResponse,
  SlackMessageEntity as SlackMessage,
} from "@ait/core";
import { apiConfig, buildQueryString } from "../config/api.config";

export class SlackService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${apiConfig.gatewayUrl}/api/slack`;
  }

  async fetchMessages(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/messages${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<SlackMessage>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async refresh(entities?: string[]) {
    const queryParams = entities ? `?entities=${entities.join(",")}` : "";
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh${queryParams}`, { method: "POST" });
    if (!result.ok) throw result.error;
    return result.value.data;
  }
}

export const slackService = new SlackService();
