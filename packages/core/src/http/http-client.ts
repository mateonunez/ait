import { AItError } from "../errors/ait-error";
import { err, ok, type Result } from "../types/result";

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
  signal?: AbortSignal;
  /** milliseconds */
  timeoutMs?: number;
}

export interface HttpResponse<T> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

function normalizeHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  if (typeof (headers as any).forEach === "function") {
    const out: Record<string, string> = {};
    (headers as Headers).forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  return headers as Record<string, string>;
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

  try {
    const response = await fetch(
      url as any,
      {
        method: options.method ?? "GET",
        headers: options.headers,
        body: options.body as any,
        signal: signals.length === 1 ? signals[0] : (undefined as any),
      } as any,
    );

    if (!response.ok) {
      return err(
        new AItError(`HTTP_${response.status}`, "HTTP error", {
          status: response.status,
          url: String(url),
        }),
      );
    }

    const data = (await response.json()) as T;
    return ok({
      status: response.status,
      headers: normalizeHeaders(response.headers as any),
      data,
    });
  } catch (e) {
    return err(new AItError("NETWORK", "Network failure", { url: String(url) }, e));
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
