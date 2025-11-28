import type { GoogleYouTubeSubscriptionExternal } from "@ait/core";
import type {
  IConnectorGoogleYouTubeDataSource,
  GoogleYouTubePaginatedResponse,
} from "../../../types/infrastructure/connector.google-youtube.data-source.interface";
import { requestJson, AItError, RateLimitError, getLogger } from "@ait/core";

export class ConnectorGoogleYouTubeDataSource implements IConnectorGoogleYouTubeDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private _logger = getLogger();

  constructor(accessToken: string) {
    this.apiUrl = "https://www.googleapis.com/youtube/v3";
    this.accessToken = accessToken;
  }

  async fetchSubscriptions(
    cursor?: string,
  ): Promise<GoogleYouTubePaginatedResponse<GoogleYouTubeSubscriptionExternal>> {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      mine: "true",
      maxResults: "50",
    });

    if (cursor) {
      params.append("pageToken", cursor);
    }

    const response = await this._fetchFromYouTube<GoogleYouTubePaginatedResponse<GoogleYouTubeSubscriptionExternal>>(
      `/subscriptions?${params.toString()}`,
    );

    return {
      ...response,
      items: response.items.map((item) => ({
        ...item,
        __type: "subscription",
      })),
    };
  }

  private async _fetchFromYouTube<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.apiUrl}${endpoint}`;
      this._logger.debug(`Fetching from YouTube: ${url}`);

      const response = await requestJson<T>(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw response.error;
      }

      return response.value.data;
    } catch (error: any) {
      if (error instanceof AItError) {
        this._logger.error("YouTube API error", {
          code: error.code,
          message: error.message,
          meta: error.meta,
        });

        // Handle rate limiting
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const retryAfter = headers["retry-after"];
          const resetTime = retryAfter ? Date.now() + Number.parseInt(retryAfter, 10) * 1000 : Date.now() + 60 * 1000;
          throw new RateLimitError("google", resetTime, "YouTube rate limit exceeded");
        }

        // Handle 403 - could be quota, disabled API, or permission issues
        if (error.code === "HTTP_403" || error.meta?.status === 403) {
          const errorMessage = error.message || "";
          const metaMessage = (error.meta?.body as any)?.error?.message || "";
          const fullMessage = metaMessage || errorMessage;

          // Check if it's an API not enabled error
          if (fullMessage.includes("has not been used") || fullMessage.includes("is disabled")) {
            throw new AItError(
              "API_DISABLED",
              "YouTube Data API is not enabled. Please enable it at https://console.cloud.google.com/apis/library/youtube.googleapis.com",
              { originalError: fullMessage },
            );
          }

          // Check if it's a permission/scope issue
          if (fullMessage.includes("insufficient") || fullMessage.includes("permission")) {
            throw new AItError(
              "INSUFFICIENT_PERMISSIONS",
              "Insufficient permissions for YouTube. Please re-authorize with the required scopes.",
              { originalError: fullMessage },
            );
          }

          // Otherwise treat as quota exceeded
          throw new RateLimitError(
            "google",
            Date.now() + 60 * 60 * 1000, // 1 hour default for quota
            `YouTube API error (403): ${fullMessage || "quota exceeded or forbidden"}`,
          );
        }

        // Handle 401 - unauthorized/token expired
        if (error.code === "HTTP_401" || error.meta?.status === 401) {
          throw new AItError("UNAUTHORIZED", "Google access token is invalid or expired. Please re-authenticate.", {
            originalError: error.message,
          });
        }

        throw error;
      }

      this._logger.error("Error fetching from YouTube", { error });
      throw new AItError("YOUTUBE_API_ERROR", `Failed to fetch from YouTube: ${error.message}`, undefined, error);
    }
  }
}
