import type { GmailMessageExternal, GmailThreadExternal } from "@ait/core";
import { AItError, RateLimitError, getErrorMessage, getLogger, requestJson } from "@ait/core";
import type {
  GmailPaginatedResponse,
  IConnectorGoogleGmailDataSource,
} from "../../../types/infrastructure/connector.google.gmail.data-source.interface";

export class ConnectorGoogleGmailDataSource implements IConnectorGoogleGmailDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private _logger = getLogger();

  constructor(accessToken: string) {
    this.apiUrl = process.env.GOOGLE_GMAIL_API_ENDPOINT || "https://gmail.googleapis.com/gmail/v1";
    this.accessToken = accessToken;
  }

  async listMessages(cursor?: string): Promise<GmailPaginatedResponse<GmailMessageExternal>> {
    const params = new URLSearchParams({
      maxResults: "100",
      includeSpamTrash: "false",
    });

    if (cursor) {
      params.append("pageToken", cursor);
    }

    try {
      const response = await this._fetchFromGoogleGmail<{
        messages?: Array<{ id: string; threadId: string }>;
        resultSizeEstimate?: number;
        nextPageToken?: string;
      }>(`/users/me/messages?${params.toString()}`);

      if (!response.messages || response.messages.length === 0) {
        return { items: [], nextCursor: undefined };
      }

      // Fetch full details for each message (batched if possible, but sequential for now to avoid complexity)
      // Note: In a production environment, we should use batch requests or simpler list + individual fetch in queue
      // For now, we will fetch details for the items
      const messages: GmailMessageExternal[] = [];

      // Limit detailed fetching to avoid rate limits during listing
      const batch = response.messages.slice(0, 10);

      for (const msg of batch) {
        try {
          const detail = await this.getMessage(msg.id);
          messages.push(detail);
        } catch (e) {
          this._logger.warn(`Failed to fetch message details for ${msg.id}`, { error: e });
        }
      }

      return {
        items: messages,
        nextCursor: response.nextPageToken,
      };
    } catch (error) {
      this._logger.error("Failed to list Gmail messages", { error });
      throw error;
    }
  }

  async getMessage(id: string): Promise<GmailMessageExternal> {
    try {
      return await this._fetchFromGoogleGmail<GmailMessageExternal>(`/users/me/messages/${id}?format=full`);
    } catch (error) {
      this._logger.error(`Failed to get Gmail message ${id}`, { error });
      throw error;
    }
  }

  async listThreads(cursor?: string): Promise<GmailPaginatedResponse<GmailThreadExternal>> {
    const params = new URLSearchParams({
      maxResults: "50",
      includeSpamTrash: "false",
    });

    if (cursor) {
      params.append("pageToken", cursor);
    }

    try {
      const response = await this._fetchFromGoogleGmail<{
        threads?: Array<{ id: string; snippet?: string; historyId?: string }>;
        resultSizeEstimate?: number;
        nextPageToken?: string;
      }>(`/users/me/threads?${params.toString()}`);

      const threads: GmailThreadExternal[] = (response.threads || []).map((t) => ({
        ...t,
        messages: [], // Minimal thread object from list
      }));

      return {
        items: threads,
        nextCursor: response.nextPageToken,
      };
    } catch (error) {
      this._logger.error("Failed to list Gmail threads", { error });
      throw error;
    }
  }

  async getThread(id: string): Promise<GmailThreadExternal> {
    try {
      return await this._fetchFromGoogleGmail<GmailThreadExternal>(`/users/me/threads/${id}?format=full`);
    } catch (error) {
      this._logger.error(`Failed to get Gmail thread ${id}`, { error });
      throw error;
    }
  }

  private async _fetchFromGoogleGmail<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;

    try {
      const result = await requestJson<T>(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!result.ok) {
        throw result.error;
      }

      return result.value.data as unknown as T;
    } catch (error: unknown) {
      if (error instanceof AItError) {
        // Log the full error for debugging
        this._logger.error("Gmail API error", {
          code: error.code,
          message: error.message,
          meta: error.meta,
        });

        // Handle rate limiting
        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          const headers = (error.meta?.headers as Record<string, string>) || {};
          const retryAfter = headers["retry-after"];
          const resetTime = retryAfter ? Date.now() + Number.parseInt(retryAfter, 10) * 1000 : Date.now() + 60 * 1000;
          throw new RateLimitError("google", resetTime, "Gmail rate limit exceeded");
        }

        // Handle 403 - could be quota, disabled API, or permission issues
        if (error.code === "HTTP_403" || error.meta?.status === 403) {
          const errorMessage = error.message || "";
          const metaMessage = (error.meta?.body as Record<string, unknown>)?.error;
          const fullMessage =
            ((typeof metaMessage === "object" && metaMessage !== null
              ? (metaMessage as Record<string, unknown>).message
              : undefined) as string) || errorMessage;

          // Check if it's an API not enabled error
          if (fullMessage.includes("has not been used") || fullMessage.includes("is disabled")) {
            throw new AItError(
              "API_DISABLED",
              "Gmail API is not enabled. Please enable it at https://console.developers.google.com/apis/api/gmail.googleapis.com/overview",
              { originalError: fullMessage },
            );
          }

          // Check if it's a permission/scope issue
          if (fullMessage.includes("insufficient") || fullMessage.includes("permission")) {
            throw new AItError(
              "INSUFFICIENT_PERMISSIONS",
              "Insufficient permissions for Gmail. Please re-authorize with the required scopes.",
              { originalError: fullMessage },
            );
          }

          // Otherwise treat as quota exceeded
          throw new RateLimitError(
            "google",
            Date.now() + 60 * 60 * 1000, // 1 hour
            `Gmail API error (403): ${fullMessage || "quota exceeded or forbidden"}`,
          );
        }

        // Handle 401 - unauthorized/token expired
        if (error.code === "HTTP_401" || error.meta?.status === 401) {
          throw new AItError("UNAUTHORIZED", "Gmail access token is invalid or expired. Please re-authenticate.", {
            originalError: error.message,
          });
        }

        throw error;
      }

      throw new AItError(
        "NETWORK",
        `Network error: ${getErrorMessage(error)}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
