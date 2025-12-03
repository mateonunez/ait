import { requestJson } from "@ait/core";
import type { NotionPageEntity as NotionPage, PaginatedResponse, PaginationParams, RefreshResponse } from "@ait/core";
import { apiConfig, buildQueryString } from "../config/api.config";

export class NotionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${apiConfig.gatewayUrl}/api/notion`;
  }

  async fetchPages(params?: PaginationParams) {
    const url = `${this.baseUrl}/data/pages${buildQueryString(params)}`;
    const result = await requestJson<PaginatedResponse<NotionPage>>(url);
    if (!result.ok) throw result.error;
    return result.value.data;
  }

  async refresh() {
    const result = await requestJson<RefreshResponse>(`${this.baseUrl}/refresh`, { method: "POST" });
    if (!result.ok) throw result.error;
    return result.value.data;
  }
}

export const notionService = new NotionService();
