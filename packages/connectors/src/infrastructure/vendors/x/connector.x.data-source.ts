import { AItError, RateLimitError, getLogger, requestJson } from "@ait/core";

import type { XMediaEntity, XPlaceEntity, XPollEntity, XTweetExternal, XTweetIncludes } from "@ait/core";
import { ait } from "../../../shared/constants/ait.constant";

export interface IConnectorXDataSource {
  fetchTweets(cursor?: string): Promise<{ tweets: XTweetExternal[]; nextCursor?: string }>;
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
  private _logger = getLogger();

  constructor(accessToken: string) {
    this.apiUrl = process.env.X_API_ENDPOINT || "https://api.x.com/2";
    this.accessToken = accessToken;
  }

  async fetchTweets(cursor?: string): Promise<{ tweets: XTweetExternal[]; nextCursor?: string }> {
    const userInfo = await this._fetchUserInfo();

    const params = new URLSearchParams({
      "tweet.fields":
        "author_id,created_at,id,text,public_metrics,entities,lang,conversation_id,in_reply_to_user_id,attachments,geo",
      expansions: "attachments.media_keys,attachments.poll_ids,geo.place_id,referenced_tweets.id",
      "media.fields": "media_key,type,url,preview_image_url,width,height,duration_ms,alt_text",
      "poll.fields": "id,options,duration_minutes,end_datetime,voting_status",
      "place.fields": "id,name,full_name,country,country_code,place_type,geo",
      max_results: "100", // X API allows up to 100 per request
    });

    if (cursor) {
      params.append("pagination_token", cursor);
    }

    const endpoint = `/users/${userInfo.id}/tweets?${params.toString()}`;
    const response = await this._fetchFromX<XAPIResponse>(endpoint);

    if (!response.data || response.data.length === 0) {
      return { tweets: [], nextCursor: undefined };
    }

    const enrichedTweets = this._enrichTweetsWithIncludes(response.data, response.includes, userInfo);

    return {
      tweets: enrichedTweets,
      nextCursor: response.meta.next_token,
    };
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
      const error = result.error;
      if (error instanceof AItError && (error.code === "HTTP_429" || error.meta?.status === 429)) {
        const headers = (error.meta?.headers as Record<string, string>) || {};
        const reset = headers["x-rate-limit-reset"];
        const resetTime = reset ? Number.parseInt(reset, 10) * 1000 : Date.now() + 15 * 60 * 1000;
        throw new RateLimitError("x", resetTime, "X rate limit exceeded");
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
        __type: "x_tweet" as const,
      };

      const attachments = tweet.attachments as { media_keys?: string[]; poll_ids?: string[] } | undefined;
      if (attachments?.media_keys && attachments.media_keys.length > 0) {
        enrichedTweet.media = attachments.media_keys
          .map((key) => mediaMap.get(key))
          .filter((media): media is XMediaEntity => media !== undefined);
      }

      if (attachments?.poll_ids && attachments.poll_ids.length > 0) {
        const pollId = attachments.poll_ids[0];
        if (pollId) {
          enrichedTweet.poll = pollMap.get(pollId);
        }
      }

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
}
