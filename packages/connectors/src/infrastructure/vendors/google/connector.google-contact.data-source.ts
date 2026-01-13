import type { GoogleContactExternal } from "@ait/core";
import { AItError, RateLimitError, getErrorMessage, getLogger, requestJson } from "@ait/core";
import type {
  GooglePeoplePaginatedResponse,
  IConnectorGoogleContactDataSource,
} from "../../../types/infrastructure/connector.google-contact.data-source.interface";

export class ConnectorGoogleContactDataSource implements IConnectorGoogleContactDataSource {
  private readonly apiUrl: string;
  private accessToken: string;
  private _logger = getLogger();

  constructor(accessToken: string) {
    this.apiUrl = process.env.GOOGLE_PEOPLE_API_ENDPOINT || "https://people.googleapis.com/v1";
    this.accessToken = accessToken;
  }

  async fetchContacts(cursor?: string): Promise<GooglePeoplePaginatedResponse<GoogleContactExternal>> {
    const params = new URLSearchParams({
      pageSize: "1000",
      personFields: "names,emailAddresses,phoneNumbers,organizations,photos,biographies",
      sortOrder: "LAST_MODIFIED_ASCENDING",
    });

    if (cursor) {
      params.append("pageToken", cursor);
    }

    try {
      const response = await this._fetchFromGooglePeople<{
        connections?: GoogleContactExternal[];
        nextPageToken?: string;
        totalPeople?: number;
        totalItems?: number;
      }>(`/people/me/connections?${params.toString()}`);

      return {
        connections: response?.connections ?? [],
        nextPageToken: response?.nextPageToken,
        totalPeople: response?.totalPeople,
        totalItems: response?.totalItems,
      };
    } catch (error) {
      this._logger.error("Failed to fetch Google Contacts", { error });
      throw error;
    }
  }

  private async _fetchFromGooglePeople<T>(
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
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!result.ok) {
        throw result.error;
      }

      return result.value.data as unknown as T;
    } catch (error: unknown) {
      if (error instanceof AItError) {
        this._logger.error("Google People API error", {
          code: error.code,
          message: error.message,
          meta: error.meta,
        });

        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          throw new RateLimitError("google", Date.now() + 60 * 1000, "Google People rate limit exceeded");
        }

        if (error.code === "HTTP_403" || error.meta?.status === 403) {
          const errorMessage = error.message || "";
          const metaBody = error.meta?.body as Record<string, unknown> | undefined;
          const metaMessage = metaBody?.error;
          const fullMessage =
            ((typeof metaMessage === "object" && metaMessage !== null
              ? (metaMessage as Record<string, unknown>).message
              : typeof metaBody === "string"
                ? metaBody
                : undefined) as string) || errorMessage;

          if (fullMessage.includes("has not been used") || fullMessage.includes("is disabled")) {
            throw new AItError(
              "API_DISABLED",
              "Google People API is not enabled. Please enable it at https://console.cloud.google.com/apis/library/people.googleapis.com",
              { originalError: fullMessage },
            );
          }

          if (fullMessage.includes("insufficient") || fullMessage.includes("permission")) {
            throw new AItError(
              "INSUFFICIENT_PERMISSIONS",
              "Insufficient permissions for Google People. Please re-authorize with the required scopes.",
              { originalError: fullMessage },
            );
          }
        }

        if (error.code === "HTTP_401" || error.meta?.status === 401) {
          throw new AItError(
            "UNAUTHORIZED",
            "Google People access token is invalid or expired. Please re-authenticate.",
            { originalError: error.message },
          );
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
