import { requestJson } from "@ait/core";
import type { Response } from "undici";
import type { XTweetExternal, XTweetIncludes, XMediaEntity, XPollEntity, XPlaceEntity } from "@ait/core";
import { ait } from "../../../shared/constants/ait.constant";

export interface IConnectorXDataSource {
  fetchTweets(): Promise<XTweetExternal[]>;
}

interface XAPIResponse {
  data: Record<string, unknown>[];
  includes?: XTweetIncludes;
  meta: {
    result_count: number;
    next_token?: string;
    newest_id?: string;
    oldest_id?: string;
  };
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
    const allTweets: XTweetExternal[] = [];
    let paginationToken: string | undefined;

    // Paginate through all tweets
    do {
      const params = new URLSearchParams({
        "tweet.fields":
          "author_id,created_at,id,text,public_metrics,entities,lang,conversation_id,in_reply_to_user_id,attachments,geo",
        expansions: "attachments.media_keys,attachments.poll_ids,geo.place_id,referenced_tweets.id",
        "media.fields": "media_key,type,url,preview_image_url,width,height,duration_ms,alt_text",
        "poll.fields": "id,options,duration_minutes,end_datetime,voting_status",
        "place.fields": "id,name,full_name,country,country_code,place_type,geo",
        max_results: "5",
      });

      if (paginationToken) {
        params.append("pagination_token", paginationToken);
      }

      const endpoint = `/users/${userInfo.id}/tweets?${params.toString()}`;
      const response = await this._fetchFromX<XAPIResponse>(endpoint);

      if (!response.data || response.data.length === 0) {
        break;
      }

      // Enrich tweets with includes data
      const enrichedTweets = this._enrichTweetsWithIncludes(response.data, response.includes, userInfo);
      allTweets.push(...enrichedTweets);

      paginationToken = response.meta.next_token;

      // Log progress
      console.info(`[X API] Fetched ${allTweets.length} tweets so far...`);
    } while (paginationToken);

    console.info(`[X API] Successfully fetched ${allTweets.length} total tweets`);
    return allTweets;
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

    // Handle rate limit (429 status)
    if (!result.ok) {
      const error = result.error as any;
      if (error.status === 429 && error.response) {
        return this._handleRateLimitExceeded(error.response as Response, endpoint, method, body);
      }
      throw result.error;
    }

    return result.value.data as unknown as T;
  }

  private _enrichTweetsWithIncludes(
    tweets: Record<string, unknown>[],
    includes: XTweetIncludes | undefined,
    userInfo: { username: string; name: string },
  ): XTweetExternal[] {
    // Create lookup maps for efficient matching
    const mediaMap = new Map<string, XMediaEntity>();
    const pollMap = new Map<string, XPollEntity>();
    const placeMap = new Map<string, XPlaceEntity>();

    if (includes?.media) {
      for (const media of includes.media) {
        mediaMap.set(media.media_key, media);
      }
    }

    if (includes?.polls) {
      for (const poll of includes.polls) {
        pollMap.set(poll.id, poll);
      }
    }

    if (includes?.places) {
      for (const place of includes.places) {
        placeMap.set(place.id, place);
      }
    }

    return tweets.map((tweet) => {
      const enrichedTweet: XTweetExternal = {
        ...tweet,
        username: userInfo.username,
        name: userInfo.name,
        __type: "tweet" as const,
      };

      // Attach media if present
      const attachments = tweet.attachments as { media_keys?: string[]; poll_ids?: string[] } | undefined;
      if (attachments?.media_keys && attachments.media_keys.length > 0) {
        enrichedTweet.media = attachments.media_keys
          .map((key) => mediaMap.get(key))
          .filter((media): media is XMediaEntity => media !== undefined);
      }

      // Attach poll if present
      if (attachments?.poll_ids && attachments.poll_ids.length > 0) {
        const pollId = attachments.poll_ids[0]; // Tweets can only have one poll
        if (pollId) {
          enrichedTweet.poll = pollMap.get(pollId);
        }
      }

      // Attach place if present
      const geo = tweet.geo as { place_id?: string } | undefined;
      if (geo?.place_id) {
        enrichedTweet.place = placeMap.get(geo.place_id);
      }

      return enrichedTweet;
    });
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
