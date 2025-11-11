import { requestJson, type AItError, type HttpRequestOptions } from "@ait/core";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface ApiGetOptions {
  isSuccessStatus?: (status: number) => boolean;
}

export async function apiGet<T>(url: string, options?: ApiGetOptions): Promise<ApiResponse<T>> {
  const requestOptions: HttpRequestOptions = {
    method: "GET",
    isSuccessStatus: options?.isSuccessStatus,
  };

  const result = await requestJson<T>(url, requestOptions);
  if (!result.ok) {
    const err = result.error as AItError;
    const status = err.meta?.status as number | undefined;
    return { ok: false, error: `${err.code}: ${err.message}`, status };
  }
  return { ok: true, data: result.value.data as unknown as T, status: result.value.status };
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
