const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || "";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const apiConfig = {
  gatewayUrl: GATEWAY_URL,
  apiBaseUrl: API_BASE_URL,
} as const;

export function buildQueryString(params?: { page?: number; limit?: number }): string {
  if (!params) return "";
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("notion_page", params.page.toString());
  if (params.limit) queryParams.append("limit", params.limit.toString());
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : "";
}
