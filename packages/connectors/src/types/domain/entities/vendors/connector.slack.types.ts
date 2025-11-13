import type { SlackMessageEntity } from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorSlackMessageRepository {
  saveMessage(message: SlackMessageEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveMessages(messages: SlackMessageEntity[]): Promise<void>;
  getMessage(id: string): Promise<SlackMessageEntity | null>;
  getMessages(): Promise<SlackMessageEntity[]>;
}

export interface IConnectorSlackRepository extends IConnectorRepository {
  message: IConnectorSlackMessageRepository;
}
