import type { GoogleYouTubeSubscriptionExternal } from "@ait/core";

export interface GoogleYouTubePaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface IConnectorGoogleYouTubeDataSource {
  fetchSubscriptions(cursor?: string): Promise<GoogleYouTubePaginatedResponse<GoogleYouTubeSubscriptionExternal>>;
}
