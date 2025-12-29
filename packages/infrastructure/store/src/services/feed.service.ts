import { type FeedRequirement, type IntegrationEntity, getLogger } from "@ait/core";
import { type IFeedRepository, getFeedRepository } from "../repositories/feed.repository";

const logger = getLogger();

export interface IFeedService {
  getBulkFeed(requirements: FeedRequirement[]): Promise<Map<string, IntegrationEntity[]>>;
}

export class FeedService implements IFeedService {
  private _repository: IFeedRepository;

  constructor(repository?: IFeedRepository) {
    this._repository = repository || getFeedRepository();
  }

  async getBulkFeed(requirements: FeedRequirement[]): Promise<Map<string, IntegrationEntity[]>> {
    logger.info(`[FeedService] Fetching bulk feed for ${requirements.length} entities`);
    return this._repository.getBulkFeed(requirements);
  }
}

let instance: FeedService | null = null;

export function getFeedService(): FeedService {
  if (!instance) {
    instance = new FeedService();
  }
  return instance;
}
