import type { PaginatedResponse, PaginationParams, SlackMessageEntity } from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorSlackMessageRepository {
  saveMessage(message: SlackMessageEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveMessages(messages: SlackMessageEntity[]): Promise<void>;
  getMessage(id: string): Promise<SlackMessageEntity | null>;
  fetchMessages(): Promise<SlackMessageEntity[]>;
  getMessagesPaginated(params: PaginationParams): Promise<PaginatedResponse<SlackMessageEntity>>;
}

export interface IConnectorSlackRepository extends IConnectorRepository {
  message: IConnectorSlackMessageRepository;
}
