import type { GmailMessageExternal, GmailThreadExternal } from "@ait/core";

export interface GmailPaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface IConnectorGoogleGmailDataSource {
  listMessages(cursor?: string): Promise<GmailPaginatedResponse<GmailMessageExternal>>;
  getMessage(id: string): Promise<GmailMessageExternal>;
  listThreads(cursor?: string): Promise<GmailPaginatedResponse<GmailThreadExternal>>;
  getThread(id: string): Promise<GmailThreadExternal>;
}
