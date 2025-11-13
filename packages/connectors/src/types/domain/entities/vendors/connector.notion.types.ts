import type { NotionPageEntity } from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorNotionPageRepository {
  savePage(page: NotionPageEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  savePages(pages: NotionPageEntity[]): Promise<void>;
  getPage(id: string): Promise<NotionPageEntity | null>;
  getPages(): Promise<NotionPageEntity[]>;
}

export interface IConnectorNotionRepository extends IConnectorRepository {
  page: IConnectorNotionPageRepository;
}
