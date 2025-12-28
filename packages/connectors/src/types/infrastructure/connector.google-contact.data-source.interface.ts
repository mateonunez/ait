import type { GoogleContactExternal } from "@ait/core";

export interface GooglePeoplePaginatedResponse<T> {
  connections: T[];
  nextPageToken?: string;
  totalPeople?: number;
  totalItems?: number;
}

export interface IConnectorGoogleContactDataSource {
  fetchContacts(cursor?: string): Promise<GooglePeoplePaginatedResponse<GoogleContactExternal>>;
}
