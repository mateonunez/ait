import { requestJson } from "@ait/core";
import type { Response } from "undici";
import type { XTweetExternal } from "@ait/core";
import { ait } from "../../../shared/constants/ait.constant";

export interface IConnectorXDataSource {
  fetchTweets(): Promise<XTweetExternal[]>;
}

export class ConnectorXDataSource implements IConnectorXDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private _userInfo: { id: string; username: string; name: string } | null = null;

  constructor(accessToken: string) {
    this.apiUrl = process.env.X_API_ENDPOINT || "https://api.x.com/2";
    this.accessToken = accessToken;
  }

  async fetchTweets(): Promise<XTweetExternal[]> {
    const userInfo = await this._fetchUserInfo();

    const params = new URLSearchParams({
      "tweet.fields": "author_id,created_at,id,text,public_metrics,entities,lang",
      max_results: "5",
    });

    const endpoint = `/users/${userInfo.id}/tweets?${params.toString()}`;
    const response = await this._fetchFromX<{
      data: Record<string, unknown>[];
      meta: { result_count: number };
    }>(endpoint);

    return response.data.map((tweet) => ({
      ...tweet,
      username: userInfo.username,
      name: userInfo.name,
      __type: "tweet" as const,
    }));
  }

  private async _fetchFromX<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

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
      throw result.error;
    }

    return result.value.data as unknown as T;
  }

  private async _fetchUserInfo(): Promise<{ id: string; username: string; name: string }> {
    if (this._userInfo) return this._userInfo;

    const response = await this._fetchFromX<{ data: { id: string; username: string; name: string } }>(
      "/users/me?user.fields=username,name",
    );
    this._userInfo = {
      id: response.data.id,
      username: response.data.username,
      name: response.data.name,
    };
    return this._userInfo;
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
