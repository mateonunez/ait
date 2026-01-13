import { requestJson } from "@ait/core";
import type { LinearIssueEntity as LinearIssue, PaginatedResponse, PaginationParams, RefreshResponse } from "@ait/core";
import { apiConfig, buildQueryString } from "../config/api.config";

export class LinearService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${apiConfig.gatewayUrl}/api/linear`;
  }

  async fetchIssues(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/issues${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<LinearIssue>>(url);
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

export const linearService = new LinearService();
