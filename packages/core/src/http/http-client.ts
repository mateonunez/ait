import { AItError } from "../errors/ait-error";
import { type Result, err, ok } from "../types/result";

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  signal?: AbortSignal;
  timeoutMs?: number;
  isSuccessStatus?: (status: number) => boolean;
}

export interface HttpResponse<T> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

function normalizeHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  return headers;
}

export async function requestJson<T>(
  url: string | URL,
  options: HttpRequestOptions = {},
): Promise<Result<HttpResponse<T>, AItError>> {
  const controller = new AbortController();
  const signals: AbortSignal[] = [];
  if (options.signal) signals.push(options.signal);
  signals.push(controller.signal);

  let timeout: ReturnType<typeof setTimeout> | undefined;
  if (options.timeoutMs && options.timeoutMs > 0) {
    timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  }

  const isSuccessStatus = options.isSuccessStatus ?? ((status: number) => status >= 200 && status < 300);

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body,
      signal: signals.length === 1 ? signals[0] : undefined,
    });

    if (!isSuccessStatus(response.status)) {
      return err(
        new AItError(`HTTP_${response.status}`, "HTTP error", {
          status: response.status,
          url: String(url),
          headers: normalizeHeaders(response.headers),
        }),
      );
    }

    const data = (await response.json()) as T;
    return ok({
      status: response.status,
      headers: normalizeHeaders(response.headers),
      data,
    });
  } catch (e) {
    return err(new AItError("NETWORK", "Network failure", { url: String(url) }, e));
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function requestStream(
  url: string | URL,
  options: HttpRequestOptions = {},
): Promise<Result<Response, AItError>> {
  const isSuccessStatus = options.isSuccessStatus ?? ((status: number) => status >= 200 && status < 300);

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body,
      signal: options.signal,
    });

    if (!isSuccessStatus(response.status)) {
      return err(
        new AItError(`HTTP_${response.status}`, "HTTP error", {
          status: response.status,
          url: String(url),
        }),
      );
    }

    return ok(response);
  } catch (e) {
    return err(new AItError("NETWORK", "Network failure", { url: String(url) }, e));
  }
}
