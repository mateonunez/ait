import { fetch, type Response } from "undici";
import type { XTweetExternal } from "../../../types/domain/entities/vendors/connector.x.repository.types";

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
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "User-Agent": "MyApp/1.0", // Required by Twitter API
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 429) {
        return this._handleRateLimitExceeded<T>(response, endpoint, method, body);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ConnectorXDataSourceError(`X API error: ${response.status} ${response.statusText}`, errorBody);
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error instanceof ConnectorXDataSourceError) {
        throw error;
      }
      throw new ConnectorXDataSourceError(`Network error: ${error.message}`, "");
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

export class ConnectorXDataSourceError extends Error {
  public responseBody: string;

  constructor(message: string, responseBody: string) {
    super(message);
    this.name = "ConnectorXDataSourceError";
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ConnectorXDataSourceError.prototype);
  }
}
