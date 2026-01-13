import type { GmailMessageEntity, GmailMessageExternal, PaginatedResponse, PaginationParams } from "@ait/core";

export interface IConnectorGoogleGmailRepository {
  save(data: GmailMessageExternal, connectorConfigId: string): Promise<void>;
  saveMessages(data: GmailMessageExternal[], connectorConfigId: string): Promise<void>;
  getMessagesPaginated(params: PaginationParams): Promise<PaginatedResponse<GmailMessageEntity>>;
}
