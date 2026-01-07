import { type AItError, type HttpRequestOptions, requestJson } from "@ait/core";

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface ApiGetOptions {
  isSuccessStatus?: (status: number) => boolean;
}

const DEFAULT_HEADERS = {
  "X-User-Id": "anonymous",
};

export async function apiGet<T>(url: string, options?: ApiGetOptions): Promise<ApiResponse<T>> {
  const requestOptions: HttpRequestOptions = {
    method: "GET",
    headers: DEFAULT_HEADERS,
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

export async function apiPost<T, B = unknown>(url: string, body?: B): Promise<ApiResponse<T>> {
  const result = await requestJson<T>(url, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!result.ok) {
    const err = result.error as AItError;
    return { ok: false, error: `${err.code}: ${err.message}` };
  }
  return { ok: true, data: result.value.data as unknown as T };
}

export async function apiPatch<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  const result = await requestJson<T>(url, {
    method: "PATCH",
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!result.ok) {
    const err = result.error as AItError;
    return { ok: false, error: `${err.code}: ${err.message}` };
  }
  return { ok: true, data: result.value.data as unknown as T };
}

export async function apiDelete(url: string): Promise<ApiResponse<void>> {
  const result = await requestJson<void>(url, {
    method: "DELETE",
    headers: DEFAULT_HEADERS,
  });
  if (!result.ok) {
    const err = result.error as AItError;
    return { ok: false, error: `${err.code}: ${err.message}` };
  }
  return { ok: true };
}
