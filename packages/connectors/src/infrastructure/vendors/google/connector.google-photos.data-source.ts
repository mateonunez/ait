import type { GooglePhotoExternal, PickerPhotoInput } from "@ait/core";
import { AItError, RateLimitError, getLogger, requestJson } from "@ait/core";
import type { GooglePhotosPaginatedResponse } from "../../../types/infrastructure/connector.google-photos.data-source.interface";

export class ConnectorGooglePhotosDataSource {
  private readonly _baseUrl = "https://photoslibrary.googleapis.com/v1";
  private _logger = getLogger();
  private _accessToken: string;

  constructor(accessToken: string) {
    this._accessToken = accessToken;
  }

  async fetchPhotos(cursor?: string): Promise<GooglePhotosPaginatedResponse<GooglePhotoExternal>> {
    let currentCursor = cursor;
    let pageCount = 0;
    const MAX_EMPTY_PAGES = 10;

    while (pageCount < MAX_EMPTY_PAGES) {
      const params = new URLSearchParams();

      if (currentCursor) {
        params.append("pageToken", currentCursor);
      }

      try {
        const response = await this._fetchFromGooglePhotos<GooglePhotosPaginatedResponse<GooglePhotoExternal>>(
          `/mediaItems?${params.toString()}`,
          "GET",
        );

        const itemCount = response.mediaItems?.length || 0;

        this._logger.info("Fetched Google Photos page", {
          cursor: currentCursor,
          itemCount,
          nextPageToken: response.nextPageToken,
          pageIteration: pageCount + 1,
        });

        if (itemCount > 0 || !response.nextPageToken) {
          return response;
        }

        currentCursor = response.nextPageToken;
        pageCount++;

        if (pageCount >= MAX_EMPTY_PAGES) {
          this._logger.warn(`[GooglePhotos] Hit max empty pages limit (${MAX_EMPTY_PAGES}). Stopping scan.`);
          return { mediaItems: [], nextPageToken: undefined };
        }
      } catch (error) {
        this._logger.error("Failed to fetch Google Photos", { error });
        throw error;
      }
    }

    return { mediaItems: [] }; // Safe fallback
  }

  private async _fetchFromGooglePhotos<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this._baseUrl}${endpoint}`;

    try {
      const result = await requestJson<T>(url, {
        method,
        headers: {
          Authorization: `Bearer ${this._accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!result.ok) {
        throw result.error;
      }

      return result.value.data as unknown as T;
    } catch (error: any) {
      if (error instanceof AItError) {
        // Reuse error handling logic from other connectors or keep it simple for now
        this._logger.error("Google Photos API error", {
          code: error.code,
          message: error.message,
          meta: error.meta,
        });

        if (error.code === "HTTP_429" || error.meta?.status === 429) {
          throw new RateLimitError("google", Date.now() + 60 * 1000, "Google Photos rate limit exceeded");
        }

        if (error.code === "HTTP_401" || error.meta?.status === 401) {
          throw new AItError(
            "UNAUTHORIZED",
            "Google Photos access token is invalid or expired. Please re-authenticate.",
            { originalError: error.message },
          );
        }

        throw error;
      }

      throw new AItError("NETWORK", `Network error: ${error.message}`, undefined, error);
    }
  }

  async createPickerSession(): Promise<any> {
    // https://developers.google.com/photos/picker/reference/rest/v1/sessions/create
    const url = "https://photospicker.googleapis.com/v1/sessions";
    // Using a separate request here since the base URL is different
    return this._fetchFromUrl(url, "POST");
  }

  async getPickerSession(sessionId: string): Promise<any> {
    // https://developers.google.com/photos/picker/reference/rest/v1/sessions/get
    const url = `https://photospicker.googleapis.com/v1/sessions/${sessionId}`;
    return this._fetchFromUrl(url, "GET");
  }

  async listPickerMediaItems(sessionId: string): Promise<PickerPhotoInput[]> {
    // https://developers.google.com/photos/picker/reference/rest/v1/mediaItems/list
    const allItems: PickerPhotoInput[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const params = new URLSearchParams({ sessionId });
      if (pageToken) {
        params.append("pageToken", pageToken);
      }

      const url = `https://photospicker.googleapis.com/v1/mediaItems?${params.toString()}`;
      const response = await this._fetchFromUrl<{ mediaItems?: PickerPhotoInput[]; nextPageToken?: string }>(
        url,
        "GET",
      );

      if (response.mediaItems?.length) {
        allItems.push(...response.mediaItems);
        this._logger.info(`Fetched ${response.mediaItems.length} photos from Picker (total: ${allItems.length})`);
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    this._logger.info(`Total photos fetched from Picker: ${allItems.length}`);
    return allItems;
  }

  private async _fetchFromUrl<T>(
    url: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    try {
      const result = await requestJson<T>(url, {
        method,
        headers: {
          Authorization: `Bearer ${this._accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!result.ok) {
        throw result.error;
      }

      return result.value.data as unknown as T;
    } catch (error: any) {
      this._logger.error("Google Picker API error", { error });
      throw error;
    }
  }
}
