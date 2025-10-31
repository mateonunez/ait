import { requestJson } from "@ait/core";
import { AItError } from "@ait/core";
import type { Response } from "undici";
import type { XTweetExternal } from "../../../types/domain/entities/vendors/connector.x.repository.types";
import { ait } from "../../../shared/constants/ait.constant";

export interface IConnectorXDataSource {
  fetchTweets(): Promise<XTweetExternal[]>;
}

export class ConnectorXDataSource implements IConnectorXDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private _userId: string | null = null;

  constructor(accessToken: string) {
    this.apiUrl = process.env.X_API_ENDPOINT || "https://api.x.com/2";
    this.accessToken = accessToken;
  }

  async fetchTweets(): Promise<XTweetExternal[]> {
    const userId = await this._fetchUserId();
    const params = new URLSearchParams({
      "tweet.fields": "author_id,created_at,id,text,public_metrics,entities,lang",
      max_results: "5",
    });

    const endpoint = `/users/${userId}/tweets?${params.toString()}`;
    const response = await this._fetchFromX<{
      data: XTweetExternal[];
      meta: { result_count: number };
    }>(endpoint);

    return response.data.map((tweet) => ({
      ...tweet,
      __type: "tweet" as const,
    }));
  }

  private async _fetchFromX<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const result = await requestJson<T>(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": `${ait} Connector V1.0.0`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!result.ok) {
        // Handle rate limit via header on error path if available
        // We cannot directly inspect headers from here because requestJson returns normalized on success.
        throw result.error;
      }

      return result.value.data as unknown as T;
    } catch (error: any) {
      if (error instanceof AItError) {
        throw error;
      }
      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }

  private async _fetchUserId(): Promise<string> {
    if (this._userId) return this._userId;

    const response = await this._fetchFromX<{ data: { id: string } }>("/users/me");
    this._userId = response.data.id;
    return this._userId;
  }

  private async _handleRateLimitExceeded<T>(
    response: Response,
    endpoint: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const MINIMUM_DELAY_MS = 1000;
    const LOG_INTERVAL_MS = 30000;

    const resetTime = this._parseRateLimitResetTime(response);
    const delay = Math.max(resetTime - Date.now(), MINIMUM_DELAY_MS);
    const delaySeconds = Math.ceil(delay / 1000);

    console.warn(`[X API] Rate limit exceeded. Waiting ${delaySeconds}s`);

    const intervalId = setInterval(() => {
      const remaining = Math.ceil((resetTime - Date.now()) / 1000);
      console.info(`[X API] Still waiting. Estimated remaining time: ${remaining}s`);
    }, LOG_INTERVAL_MS);

    try {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(null);
          clearInterval(intervalId);
        }, delay);
      });
    } finally {
      clearInterval(intervalId);
    }

    console.info("[X API] Retrying request");
    return this._fetchFromX(endpoint, method, body);
  }

  private _parseRateLimitResetTime(response: Response): number {
    const resetTimestamp = Number(response.headers.get("x-rate-limit-reset") || "0") * 1000;
    return Number.isNaN(resetTimestamp) ? Date.now() + 5000 : resetTimestamp;
  }
}
