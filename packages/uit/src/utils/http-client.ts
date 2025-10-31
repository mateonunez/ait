import { requestJson, type AItError } from "@ait/core";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  const result = await requestJson<T>(url, { method: "GET" });
  if (!result.ok) {
    const err = result.error as AItError;
    return { ok: false, error: `${err.code}: ${err.message}` };
  }
  return { ok: true, data: result.value.data as unknown as T };
}

export async function apiPost<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const result = await requestJson<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!result.ok) {
    const err = result.error as AItError;
    return { ok: false, error: `${err.code}: ${err.message}` };
  }
  return { ok: true, data: result.value.data as unknown as T };
}
