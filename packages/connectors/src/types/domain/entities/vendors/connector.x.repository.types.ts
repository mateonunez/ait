import type { PaginatedResponse, PaginationParams, XTweetEntity } from "@ait/core";
import type { IConnectorRepository, IConnectorRepositorySaveOptions } from "../connector.repository.interface";

export interface IConnectorXTweetRepository {
  saveTweet(tweet: XTweetEntity, options?: IConnectorRepositorySaveOptions): Promise<void>;
  saveTweets(tweets: XTweetEntity[]): Promise<void>;
  getTweet(id: string): Promise<XTweetEntity | null>;
  fetchTweets(): Promise<XTweetEntity[]>;
  getTweetsPaginated(params: PaginationParams): Promise<PaginatedResponse<XTweetEntity>>;
}

export interface IConnectorXRepository extends IConnectorRepository {
  tweet: IConnectorXTweetRepository;
}
